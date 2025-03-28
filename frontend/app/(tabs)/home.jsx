import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, RefreshControl, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  Cloud, 
  Droplets, 
  Thermometer, 
  AlertTriangle, 
  ArrowUpRight,
  Check,
  XCircle,
  WavesIcon
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

  const renderHumidityWarning = () => {
    const humidity = weatherData?.humidity || 0;
    if (humidity > 60) {
      return (
        <View className="mb-4">
          {/* Humidity Warning Card */}
          <View className="bg-red-500/20 p-4 rounded-2xl mb-3 flex-row items-center border border-[#00b890]/30">
            <WavesIcon size={24} color="#00b890" className="mr-3" />
            <View className="flex-1">
              <Text className="text-[#00b890] font-pbold">High Humidity Alert</Text>
              <Text className="text-gray-300 text-sm">
                Current humidity is {humidity}%. Prevent fungal growth with these recommended products:
              </Text>
            </View>
          </View>
  
          {/* Product Recommendation Cards */}
          <View className="flex-row justify-between mb-4 space-x-3">
            {/* Organic Product Card */}
            <View className="flex-1 bg-[#131d2a] p-3 rounded-xl border border-[#00b890]/30">
              <Image 
                source={{uri: 'data:image/jpeg;base64,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'}} // Replace with actual image URL
                className="h-20 w-full rounded-lg mb-2"
                resizeMode="contain"
              />
              <Text className="text-white font-pbold text-sm mb-1">Neem Oil Concentrate</Text>
              <Text className="text-gray-400 text-xs mb-2">Organic Fungicide • 500ml</Text>
              <Text className="text-[#00b890] font-pbold text-base mb-2">₹349</Text>
              <TouchableOpacity className="bg-[#00b890] py-2 rounded-lg">
                <Text className="text-white text-center text-sm font-pmedium">Buy Now</Text>
              </TouchableOpacity>
            </View>
  
            {/* Chemical Product Card */}
            <View className="flex-1 bg-[#131d2a] p-3 rounded-xl border border-[#00b890]/30">
              <Image 
                source={{uri: 'data:image/jpeg;base64,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'}} // Replace with actual image URL
                className="h-20 w-full rounded-lg mb-2"
                resizeMode="contain"
              />
              <Text className="text-white font-pbold text-sm mb-1">Bavistin Fungicide</Text>
              <Text className="text-gray-400 text-xs mb-2">Systemic Protection • 250g</Text>
              <Text className="text-[#00b890] font-pbold text-base mb-2">₹599</Text>
              <TouchableOpacity className="bg-[#00b890] py-2 rounded-lg">
                <Text className="text-white text-center text-sm font-pmedium">Buy Now</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      );
    }
    return null;
  };
  const renderNPKCard = (nutrient) => {
    const status = renderNutrientStatus(
      fertilizerData?.classified_levels?.[nutrient]
    );
    return (
      <View 
        key={nutrient} 
        className={`flex-1 p-4 rounded-2xl mr-2 ${status.bgColor}`}
      >
        <View className="flex-row justify-between items-center mb-2">
          <Text className="text-white font-pbold text-lg">{nutrient}</Text>
          {status.icon}
        </View>
        <Text className="text-white text-2xl font-pbold">
          {fertilizerData?.soil_npk_levels?.[nutrient] || 0}
        </Text>
        <Text className={`mt-1 text-sm ${status.color}`}>
          {status.status} Level
        </Text>
      </View>
    );
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
      <Assistant/>
    </SafeAreaView>
  );
};

export default Home;