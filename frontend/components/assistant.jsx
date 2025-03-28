import { View, Text, TouchableOpacity, Animated, Pressable, Dimensions, TextInput, Alert, Platform, FlatList } from 'react-native'
import React, { useState, useRef, useEffect } from 'react'
import { Feather } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import LottieView from 'lottie-react-native'
import { Audio } from 'expo-av'
import * as FileSystem from 'expo-file-system'
import axios from 'axios'
import * as Speech from 'expo-speech';
import Groq from 'groq-sdk'
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Groq client
const groq = new Groq({ apiKey: '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' })
const genAI = new GoogleGenerativeAI("AIzaSyBnkIJAU5_CFldzCvPp4cgBDo167wR_l2c");

const Assistant = () => {
  const [isVisible, setIsVisible] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [inputText, setInputText] = useState('')
  const [recording, setRecording] = useState(null)
  const [recordingUri, setRecordingUri] = useState(null)
  const [transcribedText, setTranscribedText] = useState(null)
  const [schemeDetails, setSchemeDetails] = useState(null)
  const [chatHistory, setChatHistory] = useState([]); // Chat messages
  const [loading, setLoading] = useState(false)
  const animatedValue = useRef(new Animated.Value(0)).current
  const { height } = Dimensions.get('window')

  // Define animated interpolations
  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  })

  const translateY = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [height, 0],
  })

  const scale = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 1],
  })

  useEffect(() => {
    // Request audio recording permissions
    (async () => {
      await Audio.requestPermissionsAsync()
    })()
  }, [])

  useEffect(() => {
    // Animate the popup whenever isVisible changes
    Animated.timing(animatedValue, {
      toValue: isVisible ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start()
  }, [isVisible])

  // 🔊 Function to Speak AI Response
  const speakText = (text) => {
    Speech.speak(text, {
      language: 'hi',
      rate: 0.9, // Adjust speed (0.1 - 1)
      pitch: 1.0,
    });
  };

  const transcribeAudio = async (audioUri) => {
    try {
      const fileInfo = await FileSystem.getInfoAsync(audioUri)
      if (!fileInfo.exists) {
        throw new Error('Audio file does not exist')
      }

      const formData = new FormData()
      formData.append('file', {
        uri: audioUri,
        type: 'audio/m4a',
        name: 'audio.m4a'
      })
      formData.append('model', 'whisper-large-v3')
      formData.append('response_format', 'verbose_json')

      const response = await axios.post('https://api.groq.com/openai/v1/audio/transcriptions', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${groq.apiKey}`
        }
      })

      const transcribedText = response.data.text
      console.log("Transcribed text", transcribedText)
      setInputText(transcribedText)
      
      return transcribedText
    } catch (error) {
      console.error('Transcription Error:', error)
      Alert.alert('Transcription Failed', 'Could not transcribe audio')
      return null
    }
  }

  const startRecording = async () => {
    try {
      const permissionResult = await Audio.requestPermissionsAsync()
      if (!permissionResult.granted) {
        Alert.alert('Permission needed', 'Audio recording permission is required')
        return
      }

      setIsRecording(true)
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      )
      setRecording(recording)
    } catch (err) {
      console.error('Failed to start recording', err)
      setIsRecording(false)
      Alert.alert('Recording Error', 'Could not start recording')
    }
  }

  const stopRecording = async () => {
    if (!recording) return

    try {
      await recording.stopAndUnloadAsync()
      const uri = recording.getURI()
      setRecordingUri(uri)
      setIsRecording(false)

      const transcribedText = await transcribeAudio(uri)
    } catch (err) {
      console.error('Failed to stop recording', err)
      setIsRecording(false)
      Alert.alert('Recording Error', 'Could not stop recording')
    }
  }

  const confirmTranscription = async () => {
    if (transcribedText) {
      await fetchSchemeDetails(transcribedText);
      setTranscribedText(null);
      setIsRecording(false);
    }
  }

  const cancelTranscription = () => {
    setTranscribedText(null);
    setIsRecording(false);
  }

  // Function to clean the response text
  const cleanResponseText = (text) => {
    // Remove markdown formatting (**, __, etc.)
    let cleanedText = text.replace(/\*\*/g, '').replace(/__/g, '');
    
    // Replace bullet points with new lines
    cleanedText = cleanedText.replace(/\*/g, '\n•');
    
    // Remove any remaining markdown syntax
    cleanedText = cleanedText.replace(/\[.*?\]\(.*?\)/g, ''); // Remove links
    
    return cleanedText.trim();
  };

  const fetchSchemeDetails = async (query) => {
    console.log("User Query:", query);
    setLoading(true);

    try {
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
      
      const prompt = `You are an assistant to an Indian farmer. His prompt is: ${query}. 
      Answer the farmer in short, concise and simple manner. 
      If the input prompt is in Hindi, generate answer in Hindi. 
      If it's in English then English only. 
      Provide the response in a single paragraph without any markdown formatting.`;

      const result = await model.generateContent(prompt);
      const response = await result.response.text();

      // Clean the response text
      const cleanedResponse = cleanResponseText(response) || 
        (query.toLowerCase().includes('hindi') ? 
          'आपकी खोज के लिए कोई योजना नहीं मिली।' : 
          'No schemes found for your query.');

      speakText(cleanedResponse);

      // Update chat history with single message
      setChatHistory(prevChat => [
        ...prevChat, 
        { type: 'user', text: query },
        { type: 'bot', text: cleanedResponse }
      ]);

    } catch (error) {
      console.error('Gemini API Error:', error);
      const errorMsg = query.toLowerCase().includes('hindi') ? 
        'माफ करें, योजना विवरण प्राप्त करने में त्रुटि हुई।' : 
        'Sorry, there was an error fetching scheme details.';
      
      setChatHistory(prevChat => [
        ...prevChat,
        { type: 'user', text: query },
        { type: 'bot', text: errorMsg }
      ]);
      speakText(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (inputText.trim()) {
      await fetchSchemeDetails(inputText);
      setInputText('');
    }
  };

  return (
    <>      
      <Text>home</Text>
      
      {/* Floating action button */}
      <TouchableOpacity 
        className="absolute bottom-5 right-5 bg-primary w-14 h-14 rounded-full justify-center items-center shadow-lg"
        onPress={() => setIsVisible(true)}
      >
        <Feather name="message-circle" size={24} color="#fff" />
      </TouchableOpacity>

      {/* Overlay */}
      {isVisible && (
        <Animated.View 
          className="absolute inset-0 bg-black/50"
          style={{ opacity }}
          pointerEvents={isVisible ? 'auto' : 'none'}
        >
          <Pressable 
            className="w-full h-full"
            onPress={() => setIsVisible(false)}
          />
        </Animated.View>
      )}

      {/* KrishiSaarthi Popup */}
      <Animated.View 
        className="absolute bottom-0 left-0 right-0"
        style={{ 
          transform: [{ translateY }, { scale }],
          opacity: animatedValue,
        }}
        pointerEvents={isVisible ? 'auto' : 'none'}
      >
        <View className="bg-surface rounded-t-3xl overflow-hidden">
          {/* Title bar */}
          <View className="flex-row justify-between items-center px-5 pt-5 pb-3">
            <Text className="text-white text-xl font-bold">KrishiSaarthi</Text>
            <TouchableOpacity onPress={() => setIsVisible(false)}>
              <Feather name="x" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Chat History */}
          <FlatList
            data={chatHistory}
            keyExtractor={(item, index) => index.toString()}
            renderItem={({ item }) => (
              <View className={`flex-row ${item.type === 'user' ? 'justify-end' : 'justify-start'} mb-2`}>
                <View className={`mx-5 p-3 rounded-xl max-w-[80%] ${item.type === 'user' ? 'bg-primary' : 'bg-gray-800'}`}>
                  <Text className="text-white">{item.text}</Text>
                </View>
              </View>
            )}
            className="flex-1"
            contentContainerStyle={{ paddingVertical: 10 }}
          />
          
          {/* Input bar with gradient glow */}
          <View className="px-5 pb-8">
            <LinearGradient
              colors={['rgba(30, 142, 62, 0)', 'rgba(30, 142, 62, 0)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              className="rounded-full p-[2px]"
              style={{
                shadowColor: '#1e8e3e',
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 1.5,
                shadowRadius: 10,
                elevation: 10,
              }}
            >
              <View className="flex-row items-center justify-between bg-[#121212] rounded-full px-3 py-2 border border-gray-800">
                <TextInput
                  className="flex-1 text-white text-base px-3 py-2"
                  placeholder="Ask KrishiSaarthi"
                  placeholderTextColor="#888"
                  value={inputText}
                  onChangeText={setInputText}
                  onSubmitEditing={handleSend}
                />
                
                {inputText.trim() ? (
                  <TouchableOpacity 
                    className="w-10 h-10 justify-center items-center mr-2"
                    onPress={handleSend}
                    disabled={loading}
                  >
                    <Feather 
                      name="send" 
                      size={20} 
                      color={loading ? "#888" : "#1e8e3e"} 
                    />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity 
                    className="w-10 h-10 justify-center items-center bg-primary rounded-full"
                    onPress={startRecording}
                  >
                    <Feather name="mic" size={20} color="#fff" />
                  </TouchableOpacity>
                )}
              </View>
            </LinearGradient>
          </View>
        </View>
      </Animated.View>

      {/* Voice recording popup */}
      {isRecording && (
        <View className="absolute inset-0 bg-black/80 flex justify-center items-center">
          <View className="rounded-3xl p-8 items-center">
            {!transcribedText ? (
              <>
                <View className="w-40 h-40 mb-6 bg-green-500/20 rounded-full justify-center items-center">
                  <LottieView
                    source={require('./../assets/pop.json')} 
                    autoPlay
                    loop
                    style={{ width: 150, height: 150 }} 
                  />
                </View>

                <Text className="text-white text-xl font-semibold mb-6">Listening...</Text>

                <TouchableOpacity 
                  className="bg-white rounded-full p-4"
                  onPress={stopRecording}
                >
                  <Feather name="x" size={24} color="#000" />
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View className="bg-surface p-6 rounded-xl mb-6 w-full">
                  <Text className="text-white text-lg text-center">
                    {transcribedText}
                  </Text>
                </View>

                <View className="flex-row justify-between w-full px-10">
                  <TouchableOpacity 
                    className="bg-red-500 rounded-full p-4"
                    onPress={cancelTranscription}
                  >
                    <Feather name="x" size={24} color="#fff" />
                  </TouchableOpacity>

                  <TouchableOpacity 
                    className="bg-green-500 rounded-full p-4"
                    onPress={confirmTranscription}
                  >
                    <Feather name="check" size={24} color="#fff" />
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      )}
    </>
  )
}

export default Assistant