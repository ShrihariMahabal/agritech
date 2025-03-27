import { View, Text, TouchableOpacity, TextInput, ScrollView, Image, Modal } from 'react-native'
import React, { useState } from 'react'
import WebView from 'react-native-webview'
import { GoogleGenerativeAI } from "@google/generative-ai";

const sampleImages = {
  1: require('../../assets/images/farming1.webp'),
  2: require('../../assets/images/farming2.jpg'),
  3: require('../../assets/images/farming3.webp'),
  4: require('../../assets/images/farming4.webp'),
  5: require('../../assets/images/farming5.jpg'),
};

// Add your Gemini API key here
const GEMINI_API_KEY = "AIzaSyBPohn_7cqPyK2dgvTTMfKrbLMw4fXdUY8";
// Remove the old API URL as we're using the SDK
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

const Products = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [selectedVideoTitle, setSelectedVideoTitle] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);

  const getVideoId = (url) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  };

  const handleVideoSelect = (video) => {
    setSelectedVideo(video.link);
    setSelectedVideoTitle(video.title);
    setChatMessages([]);
  };

  const handleChat = async () => {
    if (!chatInput.trim()) return;
    
    const userMessage = { type: 'user', text: chatInput };
    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setChatLoading(true);
    
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
      
      const prompt = `You are an expert on the YouTube video titled "${selectedVideoTitle}". 
                     Answer the following question as if you have watched and fully understood the video content: 
                     ${chatInput}`;
      
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const aiResponse = response.text();
      
      const aiMessage = { type: 'ai', text: aiResponse };
      setChatMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Gemini API error:', error);
      const errorMessage = { 
        type: 'ai', 
        text: error.message.replace(/\*/g, '\\*') // Escape asterisks for markdown
      };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5001/search-youtube', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: searchQuery }),
      });
      
      const data = await response.json();
      if (data.success) {
        setSearchResults(data.results);
      } else {
        alert('Error: ' + data.message);
      }
    } catch (error) {
      alert('Error searching videos: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-background min-h-full p-4">
      <Text className="mt-10 text-white font-pbold text-2xl mb-6">Learn Something New</Text>
      
      <View className="flex-row items-center mb-6 bg-surface rounded-xl overflow-hidden">
        <TextInput
          className="flex-1 px-4 py-3 text-white font-pregular"
          placeholder="What do you want to learn?"
          placeholderTextColor="#4a5568"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <TouchableOpacity 
          className="bg-primary px-6 py-3"
          onPress={handleSearch}
        >
          <Text className="text-white font-pmedium">Search</Text>
        </TouchableOpacity>
      </View>
  
      {loading ? (
        <View className="flex-1 justify-center items-center">
          <Text className="text-white font-pmedium">Loading...</Text>
        </View>
      ) : (
        <>
          <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
            {searchResults.map((video, index) => (
              <TouchableOpacity 
                key={index}
                className="mb-6 bg-surface rounded-xl overflow-hidden"
                onPress={() => handleVideoSelect(video)}
              >
                <Image
                  source={sampleImages[index + 1]}
                  className="w-full h-48"
                  resizeMode="cover"
                />
                <View className="p-4">
                  <Text className="text-white font-psemibold text-lg mb-2" numberOfLines={2}>
                    {video.title}
                  </Text>
                  <Text className="text-gray-400 font-pregular mb-1">
                    {video.channel}
                  </Text>
                  <Text className="text-gray-500 font-plight">
                    Duration: {video.duration}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
            
            {searchResults.length === 0 && !loading && (
              <View className="flex-1 justify-center items-center py-20">
                <Text className="text-gray-400 font-pmedium text-center">
                  Search for topics you want to learn about
                </Text>
              </View>
            )}
          </ScrollView>
  
          <Modal
            visible={!!selectedVideo}
            animationType="slide"
            transparent={false}
            onRequestClose={() => setSelectedVideo(null)}
          >
            <View className="flex-1 bg-background pt-12">
              <View className="h-56">
                <WebView
                  source={{ 
                    uri: selectedVideo ? 
                      `https://www.youtube.com/embed/${getVideoId(selectedVideo)}` : 
                      'about:blank'
                  }}
                  allowsFullscreenVideo
                />
              </View>
              
              <View className="flex-1 p-4">
                <Text className="text-white font-pbold text-xl mb-4">Ask about this video</Text>
                
                <ScrollView className="flex-1 mb-4">
                  {chatMessages.map((msg, index) => (
                    <View 
                      key={index} 
                      className={`mb-2 p-3 rounded-xl ${
                        msg.type === 'user' ? 'bg-primary self-end' : 'bg-surface self-start'
                      } max-w-[85%]`}
                    >
                      <Text className="text-white">{msg.text}</Text>
                    </View>
                  ))}
                  
                  {chatLoading && (
                    <View className="bg-surface self-start p-3 rounded-xl mb-2">
                      <Text className="text-white">Thinking...</Text>
                    </View>
                  )}
                  
                  {chatMessages.length === 0 && !chatLoading && (
                    <View className="flex-1 justify-center items-center py-10">
                      <Text className="text-gray-400 text-center">
                        Ask questions about the video content
                      </Text>
                    </View>
                  )}
                </ScrollView>
                
                <View className="flex-row items-center bg-surface rounded-xl overflow-hidden">
                  <TextInput
                    className="flex-1 px-4 py-3 text-white font-pregular"
                    placeholder="Ask about the video..."
                    placeholderTextColor="#4a5568"
                    value={chatInput}
                    onChangeText={setChatInput}
                  />
                  <TouchableOpacity 
                    className="bg-primary px-6 py-3"
                    onPress={handleChat}
                    disabled={chatLoading}
                  >
                    <Text className="text-white font-pmedium">Send</Text>
                  </TouchableOpacity>
                </View>
              </View>
  
              <TouchableOpacity 
                className="bg-primary p-4 mx-4 mb-4 rounded-xl"
                onPress={() => {
                  setSelectedVideo(null);
                  setChatMessages([]);
                }}
              >
                <Text className="text-white font-pmedium text-center">Close Video</Text>
              </TouchableOpacity>
            </View>
          </Modal>
        </>
      )}
    </View>
  )
}

export default Products