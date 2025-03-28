import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, RefreshControl, TouchableOpacity, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  Cloud, 
  Droplets, 
  Thermometer, 
  AlertTriangle, 
  ArrowUpRight,
  Check,
  XCircle,
  MessageCircle,
  Send,
  X
} from 'lucide-react-native';
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini
const genAI = new GoogleGenerativeAI('AIzaSyBPohn_7cqPyK2dgvTTMfKrbLMw4fXdUY8');
const model = genAI.getGenerativeModel({ model: "gemini-2.0-pro" });

const SYSTEM_PROMPT = `You are an AI assistant specialized in helping Indian farmers. You have expertise in:
- Crop management and cultivation techniques
- Pest control and disease management
- Weather impact on agriculture
- Sustainable farming practices
- Government schemes for farmers
- Modern farming technologies
Please provide practical, region-specific advice for Indian agricultural conditions.`;

const Home = () => {
  const [weatherData, setWeatherData] = useState(null);
  const [soilData, setSoilData] = useState(null);
  const [fertilizerData, setFertilizerData] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    setRefreshing(true);
    try {
      // Weather data
      const weatherResponse = await fetch('http://localhost:5002/weather');
      const weatherJson = await weatherResponse.json();
      setWeatherData(weatherJson);

      // Soil data
      const soilResponse = await fetch('http://localhost:5002/soil');
      const soilJson = await soilResponse.json();
      setSoilData(soilJson);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const kelvinToCelsius = (kelvin) => (kelvin - 273.15).toFixed(1);

  const renderNutrientStatus = (level) => {
    switch(level) {
      case 'low':
        return {
          icon: <XCircle size={20} color="#FF6B6B" />,
          color: 'text-red-500',
          bgColor: 'bg-red-500/10',
          status: 'Low'
        };
      case 'normal':
        return {
          icon: <Check size={20} color="#4ECB71" />,
          color: 'text-green-500',
          bgColor: 'bg-green-500/10',
          status: 'Optimal'
        };
      case 'high':
        return {
          icon: <ArrowUpRight size={20} color="#FFA726" />,
          color: 'text-yellow-500',
          bgColor: 'bg-yellow-500/10',
          status: 'High'
        };
      default:
        return {
          icon: <AlertTriangle size={20} color="#888" />,
          color: 'text-gray-500',
          bgColor: 'bg-gray-500/10',
          status: 'Unknown'
        };
    }
  };

  // Add this new function
  const sendMessage = async () => {
    if (!message.trim()) return;

    const userMessage = message.trim();
    setMessage('');
    setChatHistory(prev => [...prev, { type: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const chat = model.startChat({
        history: [],
        generationConfig: {
          maxOutputTokens: 1000,
        },
      });

      const result = await chat.sendMessage(SYSTEM_PROMPT + "\n\nUser: " + userMessage);
      const response = result.response.text();
      
      setChatHistory(prev => [...prev, { type: 'bot', content: response }]);
    } catch (error) {
      console.error('Chat error:', error);
      setChatHistory(prev => [...prev, { type: 'bot', content: 'Sorry, I encountered an error. Please try again.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView 
        className="flex-1 p-4"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={fetchData}
            colors={['#00b890']}
            tintColor="#00b890"
          />
        }
      >
        <View className="flex-row justify-between items-center mb-6">
          <Text className="text-3xl font-pbold text-white">Farm Dashboard</Text>
          <Text className="text-gray-400">
            {new Date().toLocaleDateString('en-US', { 
              weekday: 'short', 
              month: 'short', 
              day: 'numeric' 
            })}
          </Text>
        </View>

        {/* Weather Card */}
        <View className="bg-surface p-5 rounded-2xl mb-4 shadow-lg">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-xl font-pbold text-white">Weather Conditions</Text>
            <View className="flex-row items-center">
              <Cloud size={20} color="#00b890" />
              <Text className="text-gray-400 ml-2 capitalize">
                {weatherData?.weather || 'Fetching...'}
              </Text>
            </View>
          </View>
          <View className="flex-row justify-between">
            <View className="items-center">
              <Thermometer size={28} color="#00b890" />
              <Text className="text-white mt-2 text-lg">
                {kelvinToCelsius(weatherData?.temperature || 0)}°C
              </Text>
              <Text className="text-gray-400 text-sm">Temperature</Text>
            </View>
            <View className="items-center">
              <Droplets size={28} color="#00b890" />
              <Text className="text-white mt-2 text-lg">
                {weatherData?.humidity || 0}%
              </Text>
              <Text className="text-gray-400 text-sm">Humidity</Text>
            </View>
          </View>
        </View>
               {/* Soil Data Card */}
               <View className="bg-surface p-5 rounded-2xl mb-4 shadow-lg">
          <Text className="text-xl font-pbold text-white mb-3">Soil Conditions</Text>
          <View className="flex-row justify-between">
            <View className="items-center">
              <Thermometer size={28} color="#00b890" />
              <Text className="text-white mt-2 text-lg">
                {kelvinToCelsius(soilData?.surface_temperature || 0)}°C
              </Text>
              <Text className="text-gray-400 text-sm">Surface Temp</Text>
            </View>
            <View className="items-center">
              <Droplets size={28} color="#00b890" />
              <Text className="text-white mt-2 text-lg">
                {((soilData?.soil_moisture || 0) * 100).toFixed(1)}%
              </Text>
              <Text className="text-gray-400 text-sm">Moisture</Text>
            </View>
          </View>
        </View>
        {/* Humidity Warning */}
        {renderHumidityWarning()}

        {/* NPK Levels Card */}
        <View className="bg-surface p-5 rounded-2xl mb-4 shadow-lg">
          <Text className="text-xl font-pbold text-white mb-4">Nutrient Levels</Text>
          <View className="flex-row">
            {['N', 'P', 'K'].map(renderNPKCard)}
          </View>
        </View>

{/* Crop Recommendations */}
<View className="bg-surface p-5 rounded-2xl shadow-lg">
  <Text className="text-xl font-pbold text-white mb-4">Crop Recommendations</Text>
  {fertilizerData?.fertilizer_advice ? (
    Object.entries(fertilizerData.fertilizer_advice).map(([crop, advice]) => (
      <View key={crop} className="mb-4">
        <Text className="text-white font-pmedium text-lg mb-3">{crop}</Text>
        <View className="space-y-3">
          {advice.map((item, index) => (
            <View 
              key={index} 
              className="bg-[#00b890]/10 p-4 rounded-xl border border-[#00b890]/20"
            >
              <View className="flex-row items-start">
                <AlertTriangle size={16} color="#00b890" className="mt-1 mr-2" />
                <Text className="text-gray-300 flex-1">{item}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    ))
  ) : (
    <Text className="text-gray-400 text-center">No recommendations available</Text>
  )}
</View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default Home;