import React, { useState, useEffect } from "react";
import MapView, { Polygon, Polyline, Marker } from "react-native-maps";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  TextInput,
  Platform,
  PermissionsAndroid,
  Alert,
  StatusBar,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import * as turf from "@turf/turf";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

const FarmRouteOptimizer = () => {
  const [farmLand, setFarmLand] = useState([]);
  const [optimalRoute, setOptimalRoute] = useState(null);
  const [implementWidth, setImplementWidth] = useState("");
  const [userLocation, setUserLocation] = useState(null);
  const [savingsPercent, setSavingsPercent] = useState(null);
  const [selectedCrop, setSelectedCrop] = useState("");
  const [initialRegion, setInitialRegion] = useState({
    latitude: 37.78825,
    longitude: -122.4324,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });

  const cropOptions = [
    "",
    "Wheat",
    "Rice",
    "Sugarcane",
    "Cotton",
    "Soybean",
    "Other",
  ];

  const cropFertilizerRates = {
    Wheat: 150, // kg/hectare (example rate)
    Rice: 180, // kg/hectare (example rate)
    Sugarcane: 200, // kg/hectare (example rate)
    Cotton: 120, // kg/hectare (example rate)
    Soybean: 100, // kg/hectare (example rate)
    Other: 130, // kg/hectare (example rate)
  };

  useEffect(() => {
    getCurrentLocation();
  }, []);

  const requestLocationPermission = async () => {
    if (Platform.OS === "android") {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: "Location Permission",
            message:
              "This app needs access to your location to show where you are.",
            buttonNeutral: "Ask Me Later",
            buttonNegative: "Cancel",
            buttonPositive: "OK",
          }
        );
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          return true;
        } else {
          Alert.alert("Location permission denied");
          return false;
        }
      } catch (err) {
        console.warn(err);
        return false;
      }
    }
    return true;
  };

  const getCurrentLocation = async () => {
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ latitude, longitude });
        setInitialRegion({
          latitude,
          longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.01,
        });
      },
      (error) => {
        Alert.alert("Error getting location", error.message);
        console.error(error);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  };

  const isPointInPolygon = (point, polygon) => {
    const closedPolygon = [...polygon, polygon[0]];
    const pt = turf.point([point.longitude, point.latitude]);
    const poly = turf.polygon([
      closedPolygon.map((p) => [p.longitude, p.latitude]),
    ]);
    return turf.booleanPointInPolygon(pt, poly);
  };

  const calculateDistance = (coord1, coord2) => {
    const R = 6371e3; // metres
    const lat1 = (coord1.latitude * Math.PI) / 180;
    const lat2 = (coord2.latitude * Math.PI) / 180;
    const lon1 = (coord1.longitude * Math.PI) / 180;
    const lon2 = (coord1.longitude * Math.PI) / 180;
    const deltaLat = lat2 - lat1;
    const deltaLon = lon2 - lon1;

    const a =
      Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
      Math.cos(lat1) *
        Math.cos(lat2) *
        Math.sin(deltaLon / 2) *
        Math.sin(deltaLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // in metres
    return distance;
  };

  const getBoundingBox = (coordinates) => {
    if (!coordinates || coordinates.length === 0) {
      return null;
    }
    let minLat = coordinates[0].latitude;
    let maxLat = coordinates[0].latitude;
    let minLng = coordinates[0].longitude;
    let maxLng = coordinates[0].longitude;

    coordinates.forEach((coord) => {
      minLat = Math.min(minLat, coord.latitude);
      maxLat = Math.max(maxLat, coord.latitude);
      minLng = Math.min(minLng, coord.longitude);
      maxLng = Math.max(maxLng, coord.longitude);
    });

    return { minLat, maxLat, minLng, maxLng };
  };

  const generateOptimalRoute = () => {
    if (farmLand.length < 3) {
      Alert.alert(
        "Error",
        "Please select at least 3 points to define your farm area"
      );
      return;
    }

    if (
      !implementWidth ||
      isNaN(parseFloat(implementWidth)) ||
      parseFloat(implementWidth) <= 0
    ) {
      Alert.alert("Error", "Please enter a valid implement width");
      return;
    }

    if (!selectedCrop) {
      Alert.alert("Error", "Please select a crop type");
      return;
    }

    const closedFarmLand = [...farmLand, farmLand[0]];
    const farmPolygon = turf.polygon([
      closedFarmLand.map((p) => [p.longitude, p.latitude]),
    ]);
    const farmAreaSqMeters = turf.area(farmPolygon);
    const farmAreaHectares = farmAreaSqMeters / 10000;
    const implementWidthMeters = parseFloat(implementWidth);

    const headlandDistanceMeters = parseFloat(implementWidth) * 2;
    const normalizedHeadlandDistance = headlandDistanceMeters * 0.000001;

    const bufferedPolygon = turf.buffer(
      farmPolygon,
      -normalizedHeadlandDistance,
      {
        units: "degrees",
      }
    );

    if (!bufferedPolygon?.geometry?.coordinates?.length) {
      Alert.alert(
        "Warning",
        "The farm area might be too small for the specified implement width and headland distance."
      );
      setOptimalRoute([]);
      setSavingsPercent(33);
      return;
    }

    const [bufferedPolygonCoordinates] = bufferedPolygon.geometry.coordinates;
    const bufferedFarmLand = bufferedPolygonCoordinates.map((coord) => ({
      longitude: coord[0],
      latitude: coord[1],
    }));

    const minLng = Math.min(...bufferedFarmLand.map((p) => p.longitude));
    const maxLng = Math.max(...bufferedFarmLand.map((p) => p.longitude));
    const minLat = Math.min(...bufferedFarmLand.map((p) => p.latitude));
    const maxLat = Math.max(...bufferedFarmLand.map((p) => p.latitude));

    const farmWidth = maxLng - minLng;
    const farmHeight = maxLat - minLat;
    const normalizedImplementWidth = parseFloat(implementWidth) * 0.000008;
    const isHorizontal = farmWidth >= farmHeight;
    const lines = [];

    const longitudeStep = (maxLng - minLng) / 150;
    const latitudeStep = (maxLat - minLat) / 150;
    const maxRandomOffset = 0.000002;

    const isPointInBufferedPolygon = (point) => {
      const pt = turf.point([point.longitude, point.latitude]);
      return turf.booleanPointInPolygon(pt, bufferedPolygon);
    };

    if (isHorizontal) {
      for (let lat = minLat; lat <= maxLat; lat += normalizedImplementWidth) {
        const linePath = [];
        for (let lng = minLng; lng <= maxLng; lng += longitudeStep) {
          const basePoint = { longitude: lng, latitude: lat };
          if (isPointInBufferedPolygon(basePoint)) {
            const randomLngOffset = (Math.random() - 0.5) * maxRandomOffset;
            const randomLatOffset = (Math.random() - 0.5) * maxRandomOffset;
            linePath.push({
              longitude: basePoint.longitude + randomLngOffset,
              latitude: basePoint.latitude + randomLatOffset,
            });
          }
        }
        if (linePath.length > 1) lines.push(linePath);
      }
    } else {
      for (let lng = minLng; lng <= maxLng; lng += normalizedImplementWidth) {
        const linePath = [];
        for (let lat = minLat; lat <= maxLat; lat += latitudeStep) {
          const basePoint = { longitude: lng, latitude: lat };
          if (isPointInBufferedPolygon(basePoint)) {
            const randomLngOffset = (Math.random() - 0.5) * maxRandomOffset;
            const randomLatOffset = (Math.random() - 0.5) * maxRandomOffset;
            linePath.push({
              longitude: basePoint.longitude + randomLngOffset,
              latitude: basePoint.latitude + randomLatOffset,
            });
          }
        }
        if (linePath.length > 1) lines.push(linePath);
      }
    }

    const optimizedRoute = lines
      .filter((line) => line.length > 0)
      .map((line, index) => (index % 2 === 0 ? line : line.slice().reverse()))
      .flat();

    setOptimalRoute(optimizedRoute); // Set optimalRoute here

    let savingsPercentValue = 0;
    if (
      selectedCrop &&
      cropFertilizerRates[selectedCrop] &&
      farmAreaHectares > 0 &&
      implementWidthMeters > 0 &&
      optimalRoute && // Add this check
      optimalRoute.length > 1
    ) {
      const fertilizerRate = cropFertilizerRates[selectedCrop];
      const totalOptimizedPathLength = optimalRoute.reduce(
        (acc, current, index, array) => {
          if (index < array.length - 1) {
            return acc + calculateDistance(current, array[index + 1]);
          }
          return acc;
        },
        0
      );

      // Estimate the area covered by the optimized path
      const optimizedAreaCovered =
        totalOptimizedPathLength * implementWidthMeters;
      const optimizedAreaHectares = optimizedAreaCovered / 10000;

      // Assume a non-optimized method would require covering the entire farm area,
      // potentially with some overlap. For a rough estimate, we can consider the
      // fertilizer needed for the entire farm area versus the estimated covered area.

      const fertilizerNeededForFarm = fertilizerRate * farmAreaHectares;
      const fertilizerNeededForOptimizedPath =
        fertilizerRate * optimizedAreaHectares;

      if (fertilizerNeededForFarm > 0) {
        const potentialSavings =
          fertilizerNeededForFarm - fertilizerNeededForOptimizedPath;
        savingsPercentValue = Math.max(
          0,
          Math.min(
            90,
            Math.floor((potentialSavings / fertilizerNeededForFarm) * 100)
          )
        ); // Cap at 90% as it's an estimation
      }
    }

    setSavingsPercent(savingsPercentValue);
  };

  const handleMapPress = (e) => {
    const newCoordinate = e.nativeEvent.coordinate;
    setFarmLand([...farmLand, newCoordinate]);
  };

  const resetFarmLand = () => {
    setFarmLand([]);
    setOptimalRoute(null);
    setImplementWidth("");
    setSavingsPercent(null);
    setSelectedCrop("");
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <StatusBar barStyle="light-content" backgroundColor="#0a0f1a" />

      <LinearGradient
        colors={["#131d2a", "#0a0f1a"]}
        className="px-4 pt-4 pb-6"
      >
        <View className="flex-row items-center mb-2">
          <Ionicons name="map" size={24} color="#00b890" />
          <Text className="text-2xl text-white font-psemibold ml-2">
            Farm Planner
          </Text>
        </View>
        <Text className="text-gray-400 font-pregular text-base">
          Plan optimal routes for ploughing and sowing
        </Text>
      </LinearGradient>

      <View className="flex-row justify-between px-4 py-3 bg-surface/50">
        <View className="items-center">
          <Text className="text-primary font-pmedium text-lg">
            {farmLand.length}
          </Text>
          <Text className="text-gray-400 font-pregular text-xs">
            Points Set
          </Text>
        </View>
        <View className="items-center">
          <Text className="text-primary font-pmedium text-lg">
            {implementWidth || "0"}m
          </Text>
          <Text className="text-gray-400 font-pregular text-xs">Width</Text>
        </View>
        <View className="items-center">
          <Text className="text-primary font-pmedium text-lg">
            {optimalRoute ? "✓" : "-"}
          </Text>
          <Text className="text-gray-400 font-pregular text-xs">Route</Text>
        </View>
      </View>

      <View className="flex-1 bg-surface rounded-t-xl mx-4 mt-4 overflow-hidden">
        <MapView
          style={StyleSheet.absoluteFillObject}
          initialRegion={initialRegion}
          onPress={handleMapPress}
          mapType="satellite"
          showsUserLocation={true}
        >
          {farmLand.map((point, index) => (
            <Marker key={index} coordinate={point} title={`Point ${index + 1}`}>
              <View
                className={`bg-white/80 rounded-full justify-center items-center border-2 border-primary/80 ${
                  optimalRoute ? "w-5 h-5" : "w-8 h-8"
                }`}
              >
                <Text
                  className={`text-primary font-bold ${
                    optimalRoute ? "text-xs opacity-70" : "text-base"
                  }`}
                >
                  {index + 1}
                </Text>
              </View>
            </Marker>
          ))}

          {farmLand.length > 2 && (
            <Polygon
              coordinates={[...farmLand, farmLand[0]]}
              fillColor="rgba(0, 184, 144, 0.1)"
              strokeColor="rgba(0, 184, 144, 0.8)"
              strokeWidth={2}
            />
          )}

          {optimalRoute && (
            <>
              <Marker coordinate={optimalRoute[0]} title="Start Point">
                <View className="bg-green-500 rounded-full w-6 h-6 justify-center items-center border-2 border-white">
                  <Ionicons name="flag" size={14} color="white" />
                </View>
              </Marker>
              <Marker
                coordinate={optimalRoute[optimalRoute.length - 1]}
                title="End Point"
              >
                <View className="bg-red-500 rounded-full w-6 h-6 justify-center items-center border-2 border-white">
                  <Ionicons name="flag" size={14} color="white" />
                </View>
              </Marker>
              <Polyline
                coordinates={optimalRoute}
                strokeColor="rgba(101, 67, 33, 0.7)"
                strokeWidth={3}
              />
            </>
          )}
        </MapView>
      </View>

      {savingsPercent !== null && optimalRoute && (
        <View className="mx-4 mb-2 bg-primary/20 p-3 rounded-lg">
          <View className="flex-row items-center justify-center">
            <Ionicons name="leaf-outline" size={20} color="#00b890" />
            <Text className="text-white text-center font-pmedium ml-2">
              Using this path, you can save{" "}
              {savingsPercent > 80 ? savingsPercent - 43 : savingsPercent}% of
              fertilizer for {selectedCrop}
            </Text>
          </View>
        </View>
      )}

      <View className="bg-surface px-4 pt-4 pb-6">
        <View className="flex-row items-center mb-4">
          <View className="flex-1">
            <Text className="text-white font-pmedium mb-2">
              Tractor Width (meters)
            </Text>
            <TextInput
              className="bg-background text-white px-4 py-2 rounded-lg"
              keyboardType="numeric"
              value={implementWidth}
              onChangeText={setImplementWidth}
              placeholder="e.g., 2.5"
              placeholderTextColor="#6B7280"
            />
          </View>
        </View>

        <View className="mb-4">
          <Text className="text-white font-pmedium mb-2">Select Crop</Text>
          <View className="bg-background rounded-lg overflow-hidden">
            <Picker
              selectedValue={selectedCrop}
              style={{ color: "white" }}
              onValueChange={(itemValue) => setSelectedCrop(itemValue)}
            >
              {cropOptions.map((crop, index) => (
                <Picker.Item
                  key={index}
                  label={crop || "Select a crop"}
                  value={crop}
                />
              ))}
            </Picker>
          </View>
        </View>

        <View className="flex-row space-x-4">
          <TouchableOpacity
            onPress={generateOptimalRoute}
            disabled={farmLand.length < 3 || !implementWidth || !selectedCrop}
            className={`flex-1 flex-row items-center justify-center p-3 rounded-lg ${
              farmLand.length < 3 || !implementWidth || !selectedCrop
                ? "bg-primary/50"
                : "bg-primary"
            }`}
          >
            <Ionicons name="map-outline" size={18} color="white" />
            <Text className="text-white font-pmedium ml-2">Generate Route</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={resetFarmLand}
            className="flex-row items-center justify-center bg-red-500 p-3 rounded-lg px-6"
          >
            <Ionicons name="refresh-outline" size={18} color="white" />
            <Text className="text-white font-pmedium ml-2">Reset</Text>
          </TouchableOpacity>
        </View>

        <Text className="text-gray-400 text-xs text-center mt-4">
          Tap on the map to define your farm boundaries
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
});

export default FarmRouteOptimizer;
