import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  Cloud, 
  Droplets, 
  Thermometer, 
  AlertTriangle, 
  ArrowUpRight,
  Check,
  XCircle
} from 'lucide-react-native';
import Assistant from '../../components/assistant';

const Home = () => {
  const [weatherData, setWeatherData] = useState(null);
  const [soilData, setSoilData] = useState(null);
  const [fertilizerData, setFertilizerData] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    setRefreshing(true);
    try {
      // Weather data
      const weatherResponse = await fetch('http://127.0.0.1:5000/weather');
      const weatherJson = await weatherResponse.json();
      setWeatherData(weatherJson);

      // Soil data
      const soilResponse = await fetch('http://127.0.0.1:5000/soil');
      const soilJson = await soilResponse.json();
      setSoilData(soilJson);

      // Use axios for multipart form data upload
      const response = await axios.post(
        "https://api.groq.com/openai/v1/audio/transcriptions",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${groq.apiKey}`,
          },
        }
      );

      // Extract transcribed text
      const transcribedText = response.data.text;
      console.log("Transcribed text", transcribedText);
      setInputText(transcribedText);

      return transcribedText;
    } catch (error) {
      console.error("Transcription Error:", error);
      Alert.alert("Transcription Failed", "Could not transcribe audio");
      return null;
    }
  };

  const startRecording = async () => {
    try {
      const permissionResult = await Audio.requestPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert(
          "Permission needed",
          "Audio recording permission is required"
        );
        return;
      }

      setIsRecording(true);
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(recording);
    } catch (err) {
      console.error("Failed to start recording", err);
      setIsRecording(false);
      Alert.alert("Recording Error", "Could not start recording");
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecordingUri(uri);
      setIsRecording(false);

      // Transcribe the recorded audio
      const transcribedText = await transcribeAudio(uri);

      // if (transcribedText) {
      //   // Fetch scheme details using transcribed text
      //   await fetchSchemeDetails(transcribedText)
      // }
    } catch (err) {
      console.error("Failed to stop recording", err);
      setIsRecording(false);
      Alert.alert("Recording Error", "Could not stop recording");
    }
  };

  const fetchSchemeDetails = async (query) => {
    console.log("User Query:", query);
    setLoading(true);

    // Extract user details
    const ageMatch = query.match(/\b\d{1,3}\b/);
    const genderMatch = query.match(/\b(male|female|other)\b/i);
    const locationMatch = query.match(
      /\b(Haryana|Punjab|UP|Delhi|Rajasthan|Maharashtra)\b/i
    );

    const age = ageMatch ? ageMatch[0] : null;
    const gender = genderMatch ? genderMatch[0].toLowerCase() : null;
    const location = locationMatch ? locationMatch[0] : null;

    if (!age && !gender && !location) {
      const chatMsg =
        "Please enter your details like age, gender, or location.";
      speakText(chatMsg);
      setChatHistory((prevChat) => [
        ...prevChat,
        { type: "bot", text: chatMsg },
      ]);
      setLoading(false);
      return;
    }

    try {
      // Construct API URL dynamically
      const apiUrl = `http://localhost:5002/get_schemes?${
        age ? `age=${age}&` : ""
      }${gender ? `gender=${gender}&` : ""}${
        location ? `location=${location}` : ""
      }`;
      console.log("API Request:", apiUrl);

      const response = await fetch(apiUrl, { method: "GET" });
      const rawText = await response.text(); // Get raw response before parsing
      console.log("Raw API Response:", rawText); // Log response before JSON parsing

      // Try parsing JSON
      const data = JSON.parse(rawText);

      let botResponse = "No scheme details found for your query.";
      if (data && data.length > 0) {
        botResponse = `**${data[0].scheme_name}**\n${data[0].explanation}`;
      }

      speakText(botResponse);
      // 🔥 **Show Messages One by One for Better UX**
      const botMessages = botResponse
        .split("\n")
        .filter((line) => line.trim() !== ""); // Split response by lines
      setChatHistory((prevChat) => [
        ...prevChat,
        { type: "user", text: query },
      ]);

      botMessages.forEach((msg, index) => {
        setTimeout(() => {
          setChatHistory((prevChat) => [
            ...prevChat,
            { type: "bot", text: msg },
          ]);
        }, index * 1000); // Delay each message (1 sec per line)
      });
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
          status: 'Low'
        };
      case 'normal':
        return {
          icon: <Check size={20} color="#4ECB71" />,
          color: 'text-green-500',
          status: 'Optimal'
        };
      case 'high':
        return {
          icon: <ArrowUpRight size={20} color="#FFA726" />,
          color: 'text-yellow-500',
          status: 'High'
        };
      default:
        return {
          icon: <AlertTriangle size={20} color="#888" />,
          color: 'text-gray-500',
          status: 'Unknown'
        };
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

        {/* NPK Levels Card */}
        <View className="bg-surface p-5 rounded-2xl mb-4 shadow-lg">
          <Text className="text-xl font-pbold text-white mb-4">Nutrient Levels</Text>
          <View className="flex-row justify-between">
            {['N', 'P', 'K'].map((nutrient) => {
              const status = renderNutrientStatus(
                fertilizerData?.classified_levels?.[nutrient]
              );
              return (
                <View key={nutrient} className="items-center">
                  <View className="w-16 h-16 rounded-full border-2 border-[#00b890]/30 items-center justify-center">
                    <Text className="text-white font-pbold text-lg">{nutrient}</Text>
                  </View>
                  <Text className="text-white mt-2 text-lg">
                    {fertilizerData?.soil_npk_levels?.[nutrient] || 0}
                  </Text>
                  <View className="flex-row items-center mt-1">
                    {status.icon}
                    <Text className={`ml-2 text-sm ${status.color}`}>
                      {status.status}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Fertilizer Recommendations */}
        <View className="bg-surface p-5 rounded-2xl shadow-lg">
          <Text className="text-xl font-pbold text-white mb-4">Crop Recommendations</Text>
          {fertilizerData?.fertilizer_advice ? (
            Object.entries(fertilizerData.fertilizer_advice).map(([crop, advice]) => (
              <View key={crop} className="mb-4 bg-[#00b890]/10 p-3 rounded-xl">
                <Text className="text-white font-pmedium text-lg mb-2">{crop}</Text>
                {advice.map((item, index) => (
                  <View key={index} className="flex-row items-start mb-2">
                    <AlertTriangle size={16} color="#00b890" className="mt-1 mr-2" />
                    <Text className="text-gray-300 flex-1">{item}</Text>
                  </View>
                ))}
              </View>
            ))
          ) : (
            <Text className="text-gray-400 text-center">No recommendations available</Text>
          )}
        </View>
      </ScrollView>
      <Assistant/>
    </SafeAreaView>
  );
};

export default Home;