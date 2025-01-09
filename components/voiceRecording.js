import { ScrollView, StyleSheet, Text, View, Button, Alert, TouchableOpacity, TextInput, Animated } from "react-native";
import React, { useState, useEffect, useRef } from "react";
import { Audio } from "expo-av";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Font from 'expo-font';
import { MaterialIcons } from '@expo/vector-icons';

export default function AudioRecording() {
  const [recording, setRecording] = useState();
  const [recordings, setRecordings] = useState([]);
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [feedback, setFeedback] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadRecordings();
    loadFonts();
  }, []);

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: showFeedback ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [showFeedback]);

  async function loadFonts() {
    await Font.loadAsync({
      Outfit: require('../assets/fonts/Outfit-VariableFont_wght.ttf'), 
    });
    setFontsLoaded(true);
  }

//get recordings from async storage
  async function loadRecordings() {
    try {
      const savedRecordings = await AsyncStorage.getItem("recordings");
      if (savedRecordings !== null) {
        setRecordings(JSON.parse(savedRecordings));
      }
    } catch (error) {
      console.error("Failed to load recordings:", error);
    }
  }

  //saves recordings to async storage
  async function saveRecordings(updatedRecordings) {
    try {
      await AsyncStorage.setItem("recordings", JSON.stringify(updatedRecordings));
      setRecordings(updatedRecordings);
    } catch (error) {
      console.error("Failed to save recordings:", error);
    }
  }

  async function startRecording() {
    try {
      // Expo Audio method that prompts the user to grant or deny microphone access
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status === "granted") {
        //configures the audio mode
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true, // Enables recording on iOS devices.
          playsInSilentModeIOS: true,//Allows audio playback even when the device is in silent mode
        });
        //returns an object containing the recording instance
        const { recording } = await Audio.Recording.createAsync(
          Audio.RECORDING_OPTIONS_PRESET_HIGH_QUALITY
        );
        //updates the state of the recording, now stop recording and pause can interact with it
        setRecording(recording);
        setIsPaused(false);
      }
    } catch (err) {
      console.error("Failed to start recording", err);
    }
  }

  async function pauseRecording() {
    try {
      if (!isPaused) {
        await recording.pauseAsync();//pauses the active recording
      } else {
        await recording.startAsync();//resumes from where it was paused
      }
      setIsPaused(!isPaused);
    } catch (err) {
      console.error("Failed to pause/resume recording", err);
    }
  }
  //alert takes in title, message and an array of button objects
  function deleteRecording(index) {
    Alert.alert("Delete Recording", "Are you sure you want to delete this recording?", [
      { text: "Cancel" },
      {
        text: "Delete",
        onPress: async () => {
          //const updatedRecordings= recordings.concat()
          const updatedRecordings = [...recordings];
          // removes 1 element at the specified index from the updatedRecordings array.
          updatedRecordings.splice(index, 1);
          await saveRecordings(updatedRecordings);
        },
      },
    ]);
  }

  function getDurationFormatted(milliseconds) {
    // /1000 will give you seconds /60 gives you minutes, then round off to the nearest whole number
    const minutes = Math.floor(milliseconds / 1000 / 60);
    // /1000 to get seconds %60 to get the remainder and round to the nearest whole number
    const seconds = Math.round((milliseconds / 1000) % 60);
    //formatting the output
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  }

  function getFilteredRecordings() {
    //creates a new array that return the items that pass the test on the callback function
    return recordings.filter((recording) => {
      if (!searchTerm) return true; // Show all recordings if no search term
      //convert the string you're searching and the the name of the recording to lowercase and then comparing them
      const searchString = searchTerm.toLowerCase();
      const recordingName = recording.name.toLowerCase();
      
      return recordingName.includes(searchString);
    });
  }

  async function stopRecording() {
    try {
      setRecording(undefined); //to indicate that no recording is currently active
      setIsPaused(false);
      await recording.stopAndUnloadAsync();
      // Expo Audio API method that stops the recording and releases resources associated with it.

      //createNewLoadedSoundAsync() returns a promise that resolves to an object containing sound and status
      const { sound, status } = await recording.createNewLoadedSoundAsync();
      const newRecording = {
        sound,
        duration: getDurationFormatted(status.durationMillis),
        file: recording.getURI(),
        date: new Date().toLocaleDateString(),
        time: new Date().toLocaleTimeString(),
        isPlaying: false,
        name: `Recording #${recordings.length + 1}`, 
      };
     
      //const updatedRecordings= recordings.concat(newRecording)
      const updatedRecordings = [...recordings, newRecording];
      saveRecordings(updatedRecordings);
    } catch (err) {
      console.error("Failed to stop recording", err);
    }
  }

  function updateRecordingName(index, newName) {
    const updatedRecordings = [...recordings];
    updatedRecordings[index].name = newName;
    saveRecordings(updatedRecordings);
  }

  function getRecordingLines() {
    const filteredRecordings = getFilteredRecordings();
    return filteredRecordings.map((recordingLine, index) => {
      const originalIndex = recordings.indexOf(recordingLine);
      return (
        <View key={originalIndex} style={styles.recordingRow}>
          <TextInput
            style={styles.recordingText}
            value={recordingLine.name}
            onChangeText={(text) => updateRecordingName(originalIndex, text)}
          />
          <Text style={styles.dateText}>{`${recordingLine.date} at ${recordingLine.time}`}</Text>
          <Text style={styles.durationText}>{`Duration: ${recordingLine.duration}`}</Text>
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.playButton}
              onPress={() => {
                if (recordingLine.isPlaying) {
                  recordingLine.sound.pauseAsync();
                } else {
                  recordingLine.sound.replayAsync();
                }
                recordingLine.isPlaying = !recordingLine.isPlaying;
                setRecordings([...recordings]);
              }}
            >
              <MaterialIcons 
                name={recordingLine.isPlaying ? "pause" : "play-arrow"} 
                size={24} 
                color="#fff" 
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => deleteRecording(originalIndex)}
            >
              <MaterialIcons name="delete" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      );
    });
  }

  function submitFeedback() {
    if (!feedback.trim()) {
      Alert.alert("Error", "Please enter your feedback before submitting.");
      return;
    }

    Alert.alert(
      "Confirm Submission",
      "Are you sure you want to submit this feedback?",
      [
        { text: "Cancel" },
        {
          text: "Submit",
          onPress: () => {
            Alert.alert(
              "Thank You!",
              "Your feedback has been submitted successfully. We appreciate your input!"
            );
            setFeedback('');
            setShowFeedback(false);
          }
        }
      ]
    );
  }

  if (!fontsLoaded) return null;

  return (
    <View style={styles.mainContainer}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.header}>MicMagic</Text>
        
        <TextInput
          style={styles.searchBar}
          placeholder="Search recordings by name..."
          value={searchTerm}
          onChangeText={setSearchTerm}
        />

        {getRecordingLines()}
      </ScrollView>

      <Animated.View 
        style={[
          styles.feedbackContainer,
          {
            transform: [
              {
                translateY: slideAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [600, 0]
                })
              }
            ]
          }
        ]}
      >
        <View style={styles.feedbackHeader}>
          <Text style={styles.feedbackTitle}>Feedback & Support</Text>
          <TouchableOpacity 
            onPress={() => setShowFeedback(false)}
            style={styles.closeButton}
          >
            <MaterialIcons name="close" size={24} color="#333" />
          </TouchableOpacity>
        </View>
        <TextInput
          style={styles.feedbackInput}
          placeholder="Share your thoughts with us..."
          value={feedback}
          onChangeText={setFeedback}
          multiline
          numberOfLines={4}
        />
        <TouchableOpacity 
          style={styles.submitButton}
          onPress={submitFeedback}
        >
          <Text style={styles.submitButtonText}>Submit Feedback</Text>
        </TouchableOpacity>
        <Text style={styles.supportText}>
          Need help? Contact us at support@micmagic.com
        </Text>
      </Animated.View>

      <View style={styles.bottomContainer}>
        <TouchableOpacity 
          style={styles.feedbackButton}
          onPress={() => setShowFeedback(true)}
        >
          <MaterialIcons name="feedback" size={24} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity 
          style={[
            styles.recordButton,
            recording && styles.recordingActive
          ]}
          onPress={() => {
            //if no recording is active start the recording
            if (!recording) {
              startRecording();
              //if the state is true pause the recording
            } else if (isPaused) {
              pauseRecording();
              //if recording is active and not paused
            } else if (recording) {
              stopRecording();
            }
          }}
        >
          <MaterialIcons 
            name={
              !recording ? "mic" : 
              isPaused ? "fiber-manual-record" : 
              "stop"
            } 
            size={32} 
            color="#fff" 
          />
        </TouchableOpacity>

        {recording && (
          <TouchableOpacity 
            style={styles.pauseButton}
            onPress={pauseRecording}
          >
            <MaterialIcons 
              name={isPaused ? "play-arrow" : "pause"} 
              size={32} 
              color="#fff" 
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: "#000000",
  },
  container: {
    padding: 20,
    paddingBottom: 150, 
  },
  header: {
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    marginVertical: 20,
    color: "#fff",
    fontFamily: 'Outfit',
  },
  searchBar: {
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    paddingHorizontal: 15,
    marginBottom: 20,
    fontFamily: 'Outfit',
    backgroundColor: '#f5f5f5',
    fontSize: 16, 
  },
  recordingRow: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    padding: 10,
    marginVertical: 10,
    borderRadius: 12, 
  },
  recordingText: {
    fontSize: 18, 
    fontWeight: "bold",
    color: "#fff",
    fontFamily: 'Outfit',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    marginBottom: 10, 
    paddingBottom: 5, 
  },
  dateText: {
    fontSize: 14,
    color: "#aaa",
    fontFamily: 'Outfit',
    marginBottom: 5, 
  },
  durationText: {
    fontSize: 14,
    color: "#aaa",
    fontFamily: 'Outfit',
    marginBottom: 10, 
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 15, 
    gap: 15, 
  },
  playButton: {
    backgroundColor: "#4caf50",
    padding: 10, 
    borderRadius: 24, 
  },
  deleteButton: {
    backgroundColor: "#f44336",
    padding: 10, 
    borderRadius: 24, 
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 25, 
    paddingHorizontal: 20,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  recordButton: {
    backgroundColor: "#4caf50",
    width: 60, 
    height: 60, 
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordingActive: {
    backgroundColor: "#f44336",
  },
  pauseButton: {
    backgroundColor: "#2196f3",
    width: 56, 
    height: 56, 
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    right: 20,
  },
  feedbackButton: {
    backgroundColor: "#9c27b0",
    width: 56, 
    height: 56, 
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    left: 20,
  },
  feedbackContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 25,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  feedbackHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  feedbackTitle: {
    fontSize: 22, 
    fontWeight: "bold",
    fontFamily: 'Outfit',
  },
  closeButton: {
    padding: 8, 
  },
  feedbackInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12, 
    padding: 15, 
    marginBottom: 20, 
    fontFamily: 'Outfit',
    height: 120, 
    textAlignVertical: 'top',
    fontSize: 16, 
  },
  submitButton: {
    backgroundColor: "#9c27b0",
    padding: 15, 
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 18, 
    fontFamily: 'Outfit',
    fontWeight: "bold",
  },
  supportText: {
    fontSize: 16,
    color: "#666",
    fontFamily: 'Outfit',
    marginTop: 20, 
    textAlign: 'center',
  },
});