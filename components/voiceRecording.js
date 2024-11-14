import { ScrollView, StyleSheet, Text, View, Button, Alert, TouchableOpacity } from "react-native";
import React, { useState, useEffect } from "react";
import { Audio } from "expo-av";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Font from 'expo-font';

export default function AudioRecording() {
  const [recording, setRecording] = useState();
  const [recordings, setRecordings] = useState([]);
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    loadRecordings();
    loadFonts();
  }, []);

  async function loadFonts() {
    await Font.loadAsync({
      Outfit: require('../assets/fonts/Outfit-VariableFont_wght.ttf'), // Ensure to have this file in assets/fonts folder
    });
    setFontsLoaded(true);
  }

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
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status === "granted") {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });
        const { recording } = await Audio.Recording.createAsync(
          Audio.RECORDING_OPTIONS_PRESET_HIGH_QUALITY
        );
        setRecording(recording);
      }
    } catch (err) {
      console.error("Failed to start recording", err);
    }
  }

  async function stopRecording() {
    setRecording(undefined);
    await recording.stopAndUnloadAsync();

    const { sound, status } = await recording.createNewLoadedSoundAsync();
    const newRecording = {
      sound,
      duration: getDurationFormatted(status.durationMillis),
      file: recording.getURI(),
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString(),
    };

    const updatedRecordings = [...recordings, newRecording];
    saveRecordings(updatedRecordings);
  }

  function getDurationFormatted(milliseconds) {
    const minutes = Math.floor(milliseconds / 1000 / 60);
    const seconds = Math.round((milliseconds / 1000) % 60);
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  }


  function getRecordingLines() {
    return recordings.map((recordingLine, index) => (
      <View key={index} style={styles.recordingRow}>
        <Text style={styles.recordingText}>
          {`Recording #${index + 1} | ${recordingLine.duration}`}
        </Text>
        <Text style={styles.dateText}>{`${recordingLine.date} at ${recordingLine.time}`}</Text>
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            onPress={() => {
              recordingLine.sound.replayAsync().catch((error) => {
                console.error("Failed to replay recording:", error);
              });
            }}
          >
            <Text style={styles.playButtonText}>Play</Text>
          </TouchableOpacity>
          <Button title="Delete" color="red" onPress={() => deleteRecording(index)} />
        </View>
      </View>
    ));
  }

  function deleteRecording(index) {
    Alert.alert("Delete Recording", "Are you sure you want to delete this recording?", [
      { text: "Cancel" },
      {
        text: "Delete",
        onPress: async () => {
          const updatedRecordings = [...recordings];
          updatedRecordings.splice(index, 1);
          await saveRecordings(updatedRecordings);
        },
      },
    ]);
  }

  function clearRecordings() {
    Alert.alert("Clear All Recordings", "Are you sure you want to clear all recordings?", [
      { text: "Cancel" },
      {
        text: "Clear All",
        onPress: async () => {
          try {
            await AsyncStorage.removeItem("recordings");
            setRecordings([]);
          } catch (error) {
            console.error("Failed to clear recordings:", error);
          }
        },
      },
    ]);
  }

  if (!fontsLoaded) return null; 

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>Audio Recording App</Text>
      <TouchableOpacity style={styles.recordButton} onPress={startRecording} disabled={!!recording}>
        <Text style={styles.recordButtonText}>Start Recording</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.stopButton} onPress={stopRecording} disabled={!recording}>
        <Text style={styles.stopButtonText}>Stop Recording</Text>
      </TouchableOpacity>
      {getRecordingLines()}
      {recordings.length > 0 && (
        <Button title="Clear All Recordings" color="orange" onPress={clearRecordings} />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f7f7f7",
    padding: 20,
  },
  header: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginVertical: 20,
    color: "#333",
    fontFamily: 'Outfit',
  },
  recordingRow: {
    backgroundColor: "#fff",
    padding: 15,
    marginVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  recordingText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    fontFamily: 'Outfit',
  },
  dateText: {
    fontSize: 14,
    color: "#666",
    fontFamily: 'Outfit',
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  recordButton: {
    backgroundColor: "#4caf50",
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  recordButtonText: {
    color: "#fff",
    textAlign: "center",
    fontSize: 16,
    fontFamily: 'Outfit',
  },
  stopButton: {
    backgroundColor: "#f44336",
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  stopButtonText: {
    color: "#fff",
    textAlign: "center",
    fontSize: 16,
    fontFamily: 'Outfit',
  },
});
