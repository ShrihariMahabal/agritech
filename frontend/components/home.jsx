import { View, Text, TouchableOpacity, Animated, Pressable, Dimensions, TextInput, Alert, Platform, ScrollView } from 'react-native'
import React, { useState, useRef, useEffect } from 'react'
import { Feather } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import LottieView from 'lottie-react-native'
import { Audio } from 'expo-av'
import * as FileSystem from 'expo-file-system'
import axios from 'axios'
import Groq from 'groq-sdk'

// Initialize Groq client
const groq = new Groq({ apiKey: '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' })

const Home = () => {
  const [isVisible, setIsVisible] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [inputText, setInputText] = useState('')
  const [recording, setRecording] = useState(null)
  const [recordingUri, setRecordingUri] = useState(null)
  const [schemeDetails, setSchemeDetails] = useState(null)
  const [loading, setLoading] = useState(false)
  const [messages, setMessages] = useState([]);


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

  const transcribeAudio = async (audioUri) => {
    try {
      // Convert local file URI to a format Groq can use
      const fileInfo = await FileSystem.getInfoAsync(audioUri)
      if (!fileInfo.exists) {
        throw new Error('Audio file does not exist')
      }

      // Create a FormData object for file upload
      const formData = new FormData()
      formData.append('file', {
        uri: audioUri,
        type: 'audio/m4a',
        name: 'audio.m4a'
      })
      formData.append('model', 'whisper-large-v3')
      formData.append('response_format', 'verbose_json')

      // Use axios for multipart form data upload
      const response = await axios.post('https://api.groq.com/openai/v1/audio/transcriptions', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${groq.apiKey}`
        }
      })

      // Extract transcribed text
      const transcribedText = response.data.text
      console.log(transcribedText)
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

      // Transcribe the recorded audio
      const transcribedText = await transcribeAudio(uri)
      
      if (transcribedText) {
        // Fetch scheme details using transcribed text
        await fetchSchemeDetails(transcribedText)
      }
    } catch (err) {
      console.error('Failed to stop recording', err)
      setIsRecording(false)
      Alert.alert('Recording Error', 'Could not stop recording')
    }
  }

  const fetchSchemeDetails = async (query) => {
    setLoading(true);
    try {
      const response = await fetch(
        'http://127.0.0.1:5000/get_schemes?age=60&location=Haryana&gender=Male'
      );
      const data = await response.json();
  
      if (data && data.length > 0) {
        const newMessage = {
          id: messages.length + 1,
          text: `Name: ${data[0].scheme_name}\nExplanation: ${data[0].explanation}`,
          sender: 'bot',
        };
  
        setMessages((prevMessages) => [...prevMessages, newMessage]);
      } else {
        setMessages((prevMessages) => [
          ...prevMessages,
          { id: messages.length + 1, text: 'No scheme details found', sender: 'bot' },
        ]);
      }
    } catch (error) {
      console.error('API Error:', error);
      setMessages((prevMessages) => [
        ...prevMessages,
        { id: messages.length + 1, text: 'Could not fetch scheme details', sender: 'bot' },
      ]);
    } finally {
      setLoading(false);
    }
  };
  

  const handleSend = async () => {
    console.log("input", inputText)
    if (inputText.trim()) {
      const userMessage = {
        id: messages.length + 1,
        text: inputText,
        sender: 'user',
      };
  
      setMessages((prevMessages) => [...prevMessages, userMessage]);
      setInputText('');
      
      await fetchSchemeDetails(inputText);
    }
  };
  

  return (
    <View className="flex-1 bg-background min-h-full">
      <Text>home</Text>
      
      {/* Floating action button */}
      <TouchableOpacity 
        className="absolute bottom-5 right-5 bg-green-600 w-14 h-14 rounded-full justify-center items-center shadow-lg"
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
          
          {/* Input bar with gradient glow */}
          <View className="px-5 pb-8">
  <ScrollView className="h-80">
    {messages.map((msg) => (
      <View 
        key={msg.id} 
        className={`px-4 py-2 my-2 rounded-lg max-w-[75%] ${
          msg.sender === 'user' ? 'bg-blue-600 self-end' : 'bg-gray-800 self-start'
        }`}
      >
        <Text className="text-white">{msg.text}</Text>
      </View>
    ))}
  </ScrollView>
  
  <View className="flex-row items-center bg-[#121212] rounded-full px-3 py-2 border border-gray-800">
    <TextInput
      className="flex-1 text-white text-base px-3 py-2"
      placeholder="Ask KrishiSaarthi"
      placeholderTextColor="#888"
      value={inputText}
      onChangeText={setInputText}
    />
    
    {inputText.trim() && (
      <TouchableOpacity className="w-10 h-10 justify-center items-center mr-2" onPress={handleSend}>
        <Feather name="send" size={20} color="#1e8e3e" />
      </TouchableOpacity>
    )}
  </View>
</View>

        </View>
      </Animated.View>

      {/* Voice recording popup */}
      {isRecording && (
        <View className="absolute inset-0 bg-black/80 flex justify-center items-center">
          <View className="rounded-3xl p-8 items-center">
            <View className="w-40 h-40 mb-6 bg-green-500/20 rounded-full justify-center items-center">
              <LottieView
                source={require('./../../assets/pop.json')} 
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
          </View>
        </View>
      )}
    </View>
  )
}

export default Home
