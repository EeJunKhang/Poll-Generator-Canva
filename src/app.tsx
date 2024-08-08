import { Button, Rows, Text, Alert, LoadingIndicator } from "@canva/app-ui-kit";
import * as React from "react";
import { TextInput } from "@canva/app-ui-kit";
import styles from "styles/components.css";
import { upload } from "@canva/asset";
import { addNativeElement } from "@canva/design";
import { ArrowLeftIcon, TrashIcon, PlusIcon, GridViewIcon, GridIcon, ListBulletLtrIcon } from "@canva/app-ui-kit";
import { useSelection } from "utils/use_selection_hook";
import { useEffect, useState } from "react";
import { useInterval } from "./useInterval";

const API_KEY = "1WQZ4H973D41YRG8QTTK8BGHP9H2";

const SurveyManagement = ({ surveys, onSurveySelect, createSurvey, deleteSurvey }: { surveys: any[], onSurveySelect: (surveyName: string) => void, createSurvey: (surveyName: string) => void, deleteSurvey: (surveyName: string) => void }) => {
  const [newSurveyName, setNewSurveyName] = useState<string>('');
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [alertTone, setAlertTone] = useState<'positive' | 'critical'>('positive');
  const [isCreatingSurvey, setIsCreatingSurvey] = useState<boolean>(false);

  const handleCreateSurvey = async () => {
    if (newSurveyName.trim() === '') {
      setAlertMessage('Please enter a survey name');
      setAlertTone('critical');
      return;
    };
    setIsCreatingSurvey(true);
    createSurvey(newSurveyName);
    setIsCreatingSurvey(false);
    setNewSurveyName('');
    setAlertMessage('Survey created successfully!');
    setAlertTone('positive');
  };

  const handleDeleteSurvey = (surveyName: string) => {
    deleteSurvey(surveyName);
    setAlertMessage('Survey deleted successfully!');
    setAlertTone('positive');
  };

  const calculateRespondents = (survey) => {
    const totalVotes = survey.polls.reduce((acc, poll) => {
      return acc + poll.options.reduce((optionAcc, option) => optionAcc + option.votes_count, 0);
    }, 0);
    return survey.polls.length > 0 ? Math.floor(totalVotes / survey.polls.length) : 0;
  };

  return (
    <div className={styles.scrollContainer}>
      <div className={styles.surveyCreationContainer}>
        <TextInput
          placeholder="Survey Name"
          value={newSurveyName}
          onChange={(e) => setNewSurveyName(e)}
        />
        <Button
          onClick={handleCreateSurvey}
          variant="primary"
          loading={isCreatingSurvey}
        >
          Create
        </Button>
      </div>

      <Rows spacing="2u">
        {surveys.length === 0 ? (
          <div className={styles.noSurveys}>
            <Text size="large">No survey added</Text>
          </div>
        ) :
          (surveys.map((survey, index) => (
            <div className={styles.container}>
              <div
                key={index}
                className={styles.surveyBorderArea}
                onClick={() => onSurveySelect(survey.name)}
              >
                <div className={styles.surveyDetails}>
                  <Text>{survey.name}</Text>
                </div>
                <div className={styles.surveyIconContainer}>
                  <div className={styles.surveyIcon}>
                    <Button type="button" variant="tertiary" icon={GridIcon} ariaLabel="ariaLabel" />
                    <span className={styles.count}>{survey.polls.length}</span>
                  </div>
                  <div className={styles.surveyIcon}>
                    <Button type="button" variant="tertiary" icon={ListBulletLtrIcon} ariaLabel="ariaLabel" />
                    <span className={styles.count}>{calculateRespondents(survey)}</span>
                  </div>
                </div>
              </div>
              <div>
                <Button variant={"secondary"} onClick={() => handleDeleteSurvey(survey.name)} icon={TrashIcon}></Button>
              </div>
            </div>
          )))
        }
        {alertMessage && (
          <Alert
            onDismiss={() => setAlertMessage(null)}
            tone={alertTone}
          >
            {alertMessage}
          </Alert>
        )}
      </Rows>
    </div>
  );
};

const PollManagement = ({ survey, onBack, addPollToSurvey, deletePollFromSurvey }: { survey: any, onBack: () => void, addPollToSurvey: (surveyName: string, pollData: any) => void, deletePollFromSurvey: (surveyName: string, pollId: string) => void }) => {
  const [newPollData, setNewPollData] = useState<any>({ question: '', options: ['', ''] });
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [alertTone, setAlertTone] = useState<'positive' | 'critical'>('positive');
  const [isAddingPoll, setIsAddingPoll] = useState<boolean>(false); // Loading state
  const [isAddingQR, setIsAddingQR] = useState<boolean>(false);
  const [isAddingGraph, setIsAddingGraph] = useState<boolean>(false);
  const currentSelection = useSelection("image");
  // const API_KEY = getAPIKey();

  // if(!API_KEY){
  //   throw new Error('API KEY NOT FOUND');
  // }

  useInterval(async () => {
    await updateGraphData();
  }, 10000);

  const updateGraphData = async () => {
    try {
      const draft = await currentSelection.read();

      // Validate the selected graph
      if (draft.contents.length !== 1) {
        console.log("No image selected, skipping update.");
        return;
      }

      const content = draft.contents[0];
      const surveyIdentifier = survey.name + '-' + survey.surveyId;
      const storedImageData = getImageFromLocalStorage(surveyIdentifier);

      if (!storedImageData || content.ref !== storedImageData.ref) {
        console.log("Incorrect graph selected, skipping update.");
        return;
      }

      const chartUrl = await fetchLastestData();
      const storedChartUrl = localStorage.getItem(`${surveyIdentifier}_graphData`);

      // Check if the new chartUrl is different from the one stored in local storage
      if (chartUrl === storedChartUrl) {
        console.log("Graph data is the same, no update necessary.");
        return;
      }

      if (!chartUrl) {
        console.error("Failed to fetch chart data, skipping update.");
        setAlertMessage('Error updating graph image');
        setAlertTone('critical');
        return;
      }

      const asset = await upload({
        type: "IMAGE",
        url: chartUrl,
        mimeType: "image/png",
        thumbnailUrl: chartUrl,
        parentRef: content.ref,
      });

      saveImageToLocalStorage(surveyIdentifier, asset.ref);
      content.ref = asset.ref;

      // Update local storage with the new chartUrl
      localStorage.setItem(`${surveyIdentifier}_graphData`, chartUrl);

      await draft.save();
      console.log("Graph updated successfully.");
    } catch (error) {
      setAlertMessage('Error updating graph image');
      setAlertTone('critical');
      console.error('Error updating graph image:', error);
    }
  };
  const handleAddPoll = async () => {
    if (newPollData.question.trim() === '' || newPollData.options.some((option: string) => option.trim() === '')) {
      setAlertMessage('Please provide a question and at least two options.');
      setAlertTone('critical');
      return;
    }

    if (survey.polls.length >= 4) {
      setAlertMessage('Maximum of 4 polls allowed per survey.');
      setAlertTone('critical');
      return;
    }

    setIsAddingPoll(true);
    try {
      const response = await fetch('https://api.pollsapi.com/v1/create/poll', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': API_KEY,
        },
        body: JSON.stringify({
          question: newPollData.question,
          identifier: `${survey.name}-${survey.surveyId}`,
          data: {
            custom: 'Poll Data'
          },
          options: newPollData.options.map((option: string) => ({
            text: option,
            data: {
              custom: 'data'
            }
          }))
        }),
      });

      const data = await response.json();
      if (data.data && data.data.id) {
        addPollToSurvey(survey.name, { ...newPollData, id: data.data.id });
        setNewPollData({ question: '', options: ['', ''] }); // Reset poll fields
        setAlertMessage('Poll created successfully!');
        setAlertTone('positive');
      } else {
        throw new Error('Failed to create poll');
      }
    } catch (error) {
      console.error('Error creating poll:', error);
      setAlertMessage('Error creating poll. Please try again.');
      setAlertTone('critical');
    } finally {
      setIsAddingPoll(false);
    }
  };

  const handleAddOption = () => {
    if (newPollData.options.length >= 5) {
      setAlertMessage('Maximum of 5 options allowed per poll.');
      setAlertTone('critical');
      return;
    }
    setNewPollData({ ...newPollData, options: [...newPollData.options, ''] });
  };

  const handleDeletePoll = (pollId: string) => {
    deletePollFromSurvey(survey.name, pollId);
    setAlertMessage('Poll deleted successfully!');
    setAlertTone('positive');
  };

  const handleOptionChange = (index: number, value: string) => {
    const updatedOptions = [...newPollData.options];
    updatedOptions[index] = value;
    setNewPollData({ ...newPollData, options: updatedOptions });
  };

  const handleDeleteOption = (index: number) => {
    if (newPollData.options.length <= 2) {
      setAlertMessage('Minimum of 2 options required per poll.');
      setAlertTone('critical');
      return;
    }
    const updatedOptions = newPollData.options.filter((_: string, i: number) => i !== index);
    setNewPollData({ ...newPollData, options: updatedOptions });
  };

  // Function to fetch QR code and add it to Canva design
  const handleAddQR = async () => {
    setIsAddingQR(true); // Start loading
    const websiteURL = 'https://canva-hackathon-git-main-ians-projects-42fb0b18.vercel.app/';
    const surveyIdentifier = `${survey.name}-${survey.surveyId}`; // Combine survey name and id
    const fullUrl = `${websiteURL}?qrCodeID=${encodeURIComponent(surveyIdentifier)}`; // Create the full URL with parameters
    // console.log(fullUrl);
    try {
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(fullUrl)}`;

      const result = await upload({
        type: "IMAGE",
        mimeType: "image/png",
        url: qrCodeUrl,
        thumbnailUrl: qrCodeUrl,
      });

      await addNativeElement({
        type: "IMAGE",
        ref: result.ref,
      });

      setAlertMessage('QR code added successfully!');
      setAlertTone('positive');
    } catch (error) {
      console.error('Error adding QR code:', error);
      setAlertMessage('Failed to add QR code.');
      setAlertTone('critical');
    } finally {
      setIsAddingQR(false);
    }
  };

  const saveImageToLocalStorage = (surveyIdentifier: string, ref: string) => {
    const storedImages = JSON.parse(localStorage.getItem('graphImages') || '[]');
    const updatedImages = storedImages.filter((img: any) => img.surveyIdentifier !== surveyIdentifier);
    updatedImages.push({ surveyIdentifier, ref });
    localStorage.setItem('graphImages', JSON.stringify(updatedImages));
  };

  const getImageFromLocalStorage = (surveyIdentifier: string) => {
    const storedImages = JSON.parse(localStorage.getItem('graphImages') || '[]');
    return storedImages.find((img: any) => img.surveyIdentifier === surveyIdentifier);
  };

  const fetchLastestData = async (): Promise<string> => {
    try {
      const surveyIdentifier = survey.name + '-' + survey.surveyId;
      // Fetch poll data for the survey
      console.log(surveyIdentifier);
      const response = await fetch(`https://api.pollsapi.com/v1/get/polls-with-identifier/${surveyIdentifier}?offset=0&limit=25`, {
        headers: { 'api-key': API_KEY, },
      });
      const data = await response.json();

      if (data.status !== 'success') {
        console.error('Failed to fetch poll data');
        return '';
      }
      // Prepare the datasets and labels for the chart
      const labels = data.data.docs.map((poll: any) => "Question " + (data.data.docs.indexOf(poll) + 1));
      const datasets: any[] = [];

      data.data.docs.forEach((poll: any) => {
        poll.options.forEach((option: any, index: number) => {
          if (!datasets[index]) {
            datasets[index] = {
              label: `Option ${index + 1}`,
              data: [],
              backgroundColor: `rgba(${255 - index * 50}, ${99 + index * 50}, 132, 0.2)`,
              borderColor: `rgba(${255 - index * 50}, ${99 + index * 50}, 132, 0.2)`,
              borderWidth: 1,
            };
          }
          datasets[index].data.push(option.votes_count);
        });
      });

      const chartConfig = {
        type: 'bar',
        data: {
          labels,
          datasets,
        },
        options: {
          legend: {
            display: true,
            position: 'top',
          },
          scales: {
            xAxes: [{
              display: true,
            }],
            yAxes: [{
              display: true,
              ticks: {
                beginAtZero: true,
              },
            }],
          },
        },
      };

      // Encode chart configuration for URL
      const encodedChartConfig = encodeURIComponent(JSON.stringify(chartConfig));

      // Prepare the request URL for the QuickChart API
      const chartUrl = `https://quickchart.io/chart?c=${encodedChartConfig}&backgroundColor=white&width=500&height=300&devicePixelRatio=1.0&format=png`;
      return chartUrl;
    } catch {
      console.error('Error fetching chart data');
      return '';
    }
  }

  const handleAddGraphImage = async () => {
    try {
      setIsAddingGraph(true); // Start loading
      const chartUrl = await fetchLastestData();
      // console.log(chartUrl);
      if (chartUrl === '' || chartUrl === undefined || chartUrl === null) {
        setAlertTone('critical');
        console.log("Error fetching data");
        setAlertMessage('Error fetching data');
        return;
      }
      // Upload the image to Canva
      const uploadResult = await upload({
        type: "IMAGE",
        mimeType: "image/png",
        url: chartUrl,
        thumbnailUrl: chartUrl,
      });

      const surveyIdentifier = survey.name + '-' + survey.surveyId;
      saveImageToLocalStorage(surveyIdentifier, uploadResult.ref);

      //modify here
      localStorage.setItem(`${surveyIdentifier}_graphData`, chartUrl);

      // Add the image to the design
      await addNativeElement({
        type: "IMAGE",
        ref: uploadResult.ref,
      });
      setAlertMessage('Graph image added successfully!');
      setAlertTone('positive');
    } catch (error) {
      setAlertTone('critical');
      setAlertMessage('Error generating or uploading graph image');
      console.error('Error generating or uploading graph image:', error);
    } finally {
      setIsAddingGraph(false);
    }
  };

  const isDisabled = survey.polls.length === 0;
  const isFull = survey.polls.length !== 4;

  return (
    <div className={styles.scrollContainer}>
      <div className={styles.surveyCreationContainer}>
        <Button
          variant="secondary"
          onClick={onBack}
          icon={() => { return <ArrowLeftIcon /> }}
        >Back</Button>
        <Text>{survey.name}</Text>
      </div>
      <Rows spacing="2u">
        {survey.polls.map((poll: any, index: number) => (
          <div key={index} className={styles.pollRow}>
            <Text>{poll.question} ({poll.options.length} options)</Text>
            <Button
              variant="secondary"
              icon={() => <TrashIcon />}
              onClick={() => handleDeletePoll(poll.id)}
            >
            </Button>
          </div>
        ))}
        {isFull && (
          <Rows spacing="2u">
            <TextInput
              placeholder="Poll Question"
              value={newPollData.question}
              onChange={(e) => setNewPollData({ ...newPollData, question: e })}
            />
            {newPollData.options.map((option: string, index: number) => (
              <div className={styles.pollOptionsCon}>
                <TextInput
                  key={index}
                  placeholder={`Option ${index + 1}`}
                  value={option}
                  onChange={(e) => handleOptionChange(index, e)}
                />
                <Button
                  variant="secondary"
                  icon={() => <TrashIcon />}
                  onClick={() => handleDeleteOption(index)}
                >
                </Button>
              </div>
            ))}
            <Button variant="secondary" onClick={handleAddOption}>
              Add Option
            </Button>
            <Button
              variant="primary"
              icon={() => <PlusIcon />}
              loading={isAddingPoll}
              onClick={handleAddPoll}
              stretch
            >
              Add Poll
            </Button>
          </Rows>
        )}
        <Button
          variant="primary"
          loading={isAddingQR}
          disabled={isDisabled} // Disable if no polls are created
          onClick={handleAddQR}
          stretch
        >
          Add Qr Code
        </Button>
        <Button
          variant="primary"
          loading={isAddingGraph}
          disabled={isDisabled} // Disable if no polls are created
          icon={() => <GridViewIcon />}
          onClick={handleAddGraphImage}
          stretch
        >
          Add Respondents List
        </Button>
        {alertMessage && (
          <Alert
            onDismiss={() => setAlertMessage(null)}
            tone={alertTone}
          >
            {alertMessage}
          </Alert>
        )}
      </Rows>
    </div>
  );
};

export const App = () => {
  const [surveys, setSurveys] = useState<{ name: string, surveyId: number, polls: any[] }[]>([]);
  const [selectedSurvey, setSelectedSurvey] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Function to fetch polls on startup
  useEffect(() => {
    const fetchPolls = async () => {
      setLoading(true);
      try {
        const response = await fetch('https://api.pollsapi.com/v1/get/polls?offset=0&limit=100', {
          headers: {
            'api-key': API_KEY,
          },
        });
        const data = await response.json();

        if (data.status === 'success') {
          let surveyCounter = 0;
          const groupedSurveys = data.data.docs.reduce((acc, poll) => {
            const surveyName = poll.identifier?.split('-')[0];
            const surveyId = poll.identifier?.split('-')[1];
            if (!acc[surveyName]) {
              surveyCounter++;
              acc[surveyName] = { name: surveyName, surveyId: surveyId, polls: [] };
            }
            acc[surveyName].polls.push(poll);
            return acc;
          }, {});

          setSurveys(Object.values(groupedSurveys));
        }
        else {
          console.error('Error fetching polls:');
        }
      } catch (error) {
        console.error('Error fetching polls:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPolls();
  }, []);


  const createSurvey = (surveyName) => {
    const newSurveyId = surveys.length + 1; // Generate a new survey ID based on the number of existing surveys
    setSurveys([...surveys, { name: surveyName, surveyId: newSurveyId, polls: [] }]);
  };

  const deleteSurvey = async (surveyName: string) => {
    try {
      const surveyToDelete = surveys.find(survey => survey.name === surveyName);
      if (surveyToDelete) {
        // Delete all polls in the survey
        for (const poll of surveyToDelete.polls) {
          await fetch('https://api.pollsapi.com/v1/remove/poll', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'api-key': API_KEY,
            },
            body: JSON.stringify({ poll_id: poll.id }),
          });
        }
        // Remove the survey from state
        setSurveys(surveys.filter(survey => survey.name !== surveyName));
      }
    } catch (error) {
      console.error('Error deleting survey:', error);
    }
  };

  const deletePollFromSurvey = async (surveyName: string, pollId: string) => {
    try {
      const response = await fetch('https://api.pollsapi.com/v1/remove/poll', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': API_KEY,
        },
        body: JSON.stringify({ poll_id: pollId }),
      });
      const data = await response.json();
      if (data.status === 'success') {
        const updatedSurveys = surveys.map(survey => {
          if (survey.name === surveyName) {
            return {
              ...survey,
              polls: survey.polls.filter((poll: any) => poll.id !== pollId),
            };
          }
          return survey;
        });
        setSurveys(updatedSurveys);
      }
    } catch (error) {
      console.error('Error deleting poll:', error);
    }
  };

  const addPollToSurvey = (surveyName, pollData) => {
    const updatedSurveys = surveys.map(survey => {
      if (survey.name === surveyName) {
        return {
          ...survey,
          polls: [...survey.polls, pollData],
        };
      }
      return survey;
    });
    setSurveys(updatedSurveys);
  };

  return (
    <div className={styles.scrollContainer}>
      {loading ? (
        <div className={styles.loadingContainer}>
          <LoadingIndicator size="large" />
          <p>Loading surveys...</p>
        </div>
      ) : selectedSurvey ? (
        <PollManagement
          survey={surveys.find(survey => survey.name === selectedSurvey)!}
          onBack={() => setSelectedSurvey(null)}
          addPollToSurvey={addPollToSurvey}
          deletePollFromSurvey={deletePollFromSurvey}
        />
      ) : (
        <SurveyManagement
          surveys={surveys}
          onSurveySelect={setSelectedSurvey}
          createSurvey={createSurvey}
          deleteSurvey={deleteSurvey}
        />
      )}
    </div>
  );
};
