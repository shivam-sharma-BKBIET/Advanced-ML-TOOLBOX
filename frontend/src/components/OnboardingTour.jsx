import React from 'react';
import Joyride, { STATUS } from 'react-joyride';

export default function OnboardingTour({ run, setRun }) {
  const steps = [
    {
      target: '.tour-dashboard',
      content: 'Welcome to the ML Toolbox! This is your Dashboard overview where you can monitor system health and global usage.',
      disableBeacon: true,
      placement: 'bottom',
    },
    {
      target: '.tour-predict',
      content: 'Test our live machine learning models and see their decisions explained using SHAP values here.',
      placement: 'bottom',
    },
    {
      target: '.tour-data-studio',
      content: 'Need to clean messy data or want to try our built-in samples? The Data Studio handles deduplication, imputation, and feature engineering.',
      placement: 'bottom',
    },
    {
      target: '.tour-batch',
      content: 'Process thousands of rows at once using the Batch Prediction tool.',
      placement: 'bottom',
    },
    {
      target: '.tour-assistant',
      content: 'Stuck or need advice? Chat with our built-in AI Assistant anytime.',
      placement: 'left',
    }
  ];

  const handleJoyrideCallback = (data) => {
    const { status } = data;
    const finishedStatuses = [STATUS.FINISHED, STATUS.SKIPPED];

    if (finishedStatuses.includes(status)) {
      setRun(false);
      localStorage.setItem('hasSeenTour', 'true');
    }
  };

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous={true}
      scrollToFirstStep={true}
      showProgress={true}
      showSkipButton={true}
      callback={handleJoyrideCallback}
      styles={{
        options: {
          primaryColor: '#3b82f6', // blue-500
          zIndex: 10000,
        },
        tooltipContainer: {
          textAlign: 'left'
        },
        buttonNext: {
          backgroundColor: '#3b82f6',
          borderRadius: '8px',
        },
        buttonBack: {
          marginRight: 10
        }
      }}
    />
  );
}
