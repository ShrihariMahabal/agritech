import React, { useState, useEffect } from 'react';
import { View, Text, Dimensions, ScrollView } from 'react-native';
import { Video } from 'expo-av';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import { LinearGradient } from 'expo-linear-gradient';

// Add this after your imports
const SAMPLE_COMMENTS = [
  { id: 1, user: "Deep Patel", text: "This technique really helped improve my crop yield!", timestamp: "2 days ago" },
  { id: 2, user: "Raj Patel", text: "Great explanation of sustainable farming methods. I'll definitely try this.", timestamp: "1 week ago" },
  { id: 3, user: "Shrihari Mahabal", text: "Thanks for sharing these insights. Very practical advice!", timestamp: "3 days ago" },
  { id: 4, user: "Tanvi Patil", text: "This saved me so much time in my daily farming routine.", timestamp: "5 days ago" },
  { id: 5, user: "Piyanshu Gehani", text: "Excellent video! The step-by-step guide was very clear.", timestamp: "1 day ago" },
  { id: 6, user: "Drishya Nalavade", text: "I've been farming for 20 years and learned something new!", timestamp: "4 days ago" },
  { id: 7, user: "Atharva Dahe", text: "Perfect timing for the planting season. Thank you!", timestamp: "2 weeks ago" },
  { id: 8, user: "Dayanand Ambawade", text: "These traditional methods combined with modern techniques work great.", timestamp: "6 days ago" },
];

const VideoPlayer = () => {
  const { id } = useLocalSearchParams();
  const [error, setError] = useState(null);
  const [videoData, setVideoData] = useState(null);
  const [randomComments, setRandomComments] = useState([]); // Add this line
  const videoUrl = `http://localhost:8000/videos/stream/${id}`;
  const screenHeight = Dimensions.get('window').height;

  useEffect(() => {
    fetchVideoDetails();
    // Add this to randomly select comments
    const numComments = Math.floor(Math.random() * 3) + 3; // Random number between 3-5
    const shuffled = [...SAMPLE_COMMENTS].sort(() => 0.5 - Math.random());
    setRandomComments(shuffled.slice(0, numComments));
  }, []);

  const fetchVideoDetails = async () => {
    try {
      const response = await axios.get(`http://localhost:8000/videos/${id}`);
      setVideoData(response.data.data);
    } catch (err) {
      setError('Failed to load video details');
    }
  };

  const formatDuration = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <LinearGradient
        colors={['#0f1924', '#182635']}
        className="p-5"
      >
        <Text className="text-2xl font-pbold text-white text-center">
          Educational Video
        </Text>
        <Text className="text-base text-gray-400 text-center mt-1 font-pregular">
          Learn farming techniques
        </Text>
      </LinearGradient>

      <ScrollView className="flex-1">
        <View style={{ height: screenHeight * 0.4 }}>
          <Video
            source={{ uri: videoUrl }}
            rate={1.0}
            volume={1.0}
            isMuted={false}
            resizeMode="contain"
            shouldPlay={true}
            isLooping={false}
            style={{ flex: 1, width: '100%' }}
            useNativeControls
          />
        </View>

        <View className="p-4">
          {videoData ? (
            <>
              <Text className="text-2xl font-pbold text-white mb-2">
                {videoData.title}
              </Text>

              <LinearGradient
                colors={['#182635', '#0f1924']}
                className="p-4 rounded-lg mb-4"
              >
                <Text className="text-white font-pmedium mb-2">Description</Text>
                <Text className="text-gray-300 font-pregular leading-6">
                  {videoData.description}
                </Text>
              </LinearGradient>

              {/* Add the comments section */}
              <View className="mt-6">
                <Text className="text-white font-pmedium text-xl mb-4">Comments</Text>
                {randomComments.map((comment) => (
                  <View key={comment.id} className="bg-surface rounded-lg p-4 mb-3">
                    <View className="flex-row justify-between items-center mb-2">
                      <Text className="text-primary font-pmedium">{comment.user}</Text>
                      <Text className="text-gray-400 text-sm">{comment.timestamp}</Text>
                    </View>
                    <Text className="text-gray-300">{comment.text}</Text>
                  </View>
                ))}
              </View>
            </>
          ) : error ? (
            <Text className="text-red-500 p-4 text-center">
              {error}
            </Text>
          ) : (
            <View className="p-4">
              <Text className="text-gray-400 text-center">Loading...</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default VideoPlayer;