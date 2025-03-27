import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Svg, Polygon as SvgPolygon, Circle, Text as SvgText } from 'react-native-svg';
import { useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Farm health analysis constants
const HEALTH_STATES = {
  HEALTHY: { color: '#2ecc71', label: 'Healthy', icon: 'leaf' },
  INSECTS: { color: '#e74c3c', label: 'Insect Infestation', icon: 'bug' },
  WATER_NEEDED: { color: '#3498db', label: 'Water Needed', icon: 'water' },
  NUTRIENT_DEFICIENT: { color: '#f39c12', label: 'Nutrient Deficient', icon: 'nutrition' },
  WEED_CONTROL: { color: '#9b59b6', label: 'Weed Control Needed', icon: 'sprout' },
  DISEASE: { color: '#c0392b', label: 'Disease Detected', icon: 'biohazard' },
};

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const RouteScreen = () => {
  const params = useLocalSearchParams();
  const [polygonPoints, setPolygonPoints] = useState([]);
  const [sectors, setSectors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSector, setSelectedSector] = useState(null);
  const [svgViewBox, setSvgViewBox] = useState('0 0 1000 1000');
  const [svgPoints, setSvgPoints] = useState([]);
  const [voronoiCells, setVoronoiCells] = useState({});
  const svgRef = useRef(null);
  const initializationRef = useRef(false);

  // Convert geo coordinates to SVG coordinates
  const convertToSvgCoords = useCallback((points) => {
    // Calculate bounding box
    const lats = points.map(p => p.latitude);
    const lngs = points.map(p => p.longitude);

    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    // Add padding
    const padding = 0.1; // 10% padding
    const latRange = (maxLat - minLat) * (1 + padding);
    const lngRange = (maxLng - minLng) * (1 + padding);

    const padMinLat = minLat - (latRange * padding / 2);
    const padMinLng = minLng - (lngRange * padding / 2);

    // Calculate aspect ratio to maintain proportions
    const aspectRatio = lngRange / latRange;
    const svgWidth = 1000;
    const svgHeight = svgWidth / aspectRatio;

    // Update the SVG viewBox
    setSvgViewBox(`0 0 ${svgWidth} ${svgHeight}`);

    // Convert coordinates
    return points.map(point => {
      const x = ((point.longitude - padMinLng) / lngRange) * svgWidth;
      // Flip Y coordinates because SVG Y increases downward
      const y = svgHeight - ((point.latitude - padMinLat) / latRange) * svgHeight;
      return { x, y };
    });
  }, []);

  // Calculate centroid of a polygon
  const calculateCentroid = useCallback((points) => {
    let sumX = 0;
    let sumY = 0;
    points.forEach(point => {
      sumX += point.x;
      sumY += point.y;
    });
    return {
      x: sumX / points.length,
      y: sumY / points.length
    };
  }, []);

  // Check if a point is inside a polygon (ray casting algorithm)
  const isPointInPolygon = useCallback((point, polygon) => {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].x;
      const yi = polygon[i].y;
      const xj = polygon[j].x;
      const yj = polygon[j].y;

      const intersect = ((yi > point.y) !== (yj > point.y)) &&
        (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);

      if (intersect) inside = !inside;
    }
    return inside;
  }, []);

  // Helper: Line intersection calculation
  const lineIntersection = useCallback((x1, y1, x2, y2, x3, y3, x4, y4) => {
    const denom = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
    if (denom === 0) return null;

    const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denom;
    const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denom;

    if (ua < 0 || ua > 1 || ub < 0 || ub > 1) return null;

    return {
      x: x1 + ua * (x2 - x1),
      y: y1 + ua * (y2 - y1)
    };
  }, []);

  // Helper: 2D distance
  const distance2D = useCallback((x1, y1, x2, y2) => {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
  }, []);

  // Main initialization useEffect
  useEffect(() => {
    // Prevent duplicate initialization
    if (initializationRef.current) return;

    let points;
    if (params.polygonData) {
      try {
        points = JSON.parse(params.polygonData);
      } catch (error) {
        console.error("Error parsing polygon data:", error);
        setLoading(false);
        return;
      }
    } else {
      // For development/testing - use sample data if no params provided
      points = [
        { "latitude": 19.18568815598173, "longitude": 72.96239107847214 },
        { "latitude": 19.185819250844453, "longitude": 72.96389110386372 },
        { "latitude": 19.183209050149493, "longitude": 72.96419218182564 },
        { "latitude": 19.182968389018917, "longitude": 72.96224322170019 }
      ];
    }

    setPolygonPoints(points);
    initializationRef.current = true;

    // Convert to SVG coordinates
    const convertedPoints = convertToSvgCoords(points);
    setSvgPoints(convertedPoints);

    // Calculate polygon centroid
    const centroid = calculateCentroid(convertedPoints);

    // Number of sectors to generate (IOT devices)
    const numSectors = 8;

    // Calculate sector points evenly distributed within the polygon
    const sectorPoints = [];

    // Use an offset centroid as the first point
    sectorPoints.push({
      x: centroid.x * 0.8 + convertedPoints[0].x * 0.2,
      y: centroid.y * 0.8 + convertedPoints[0].y * 0.2
    });

    // Generate additional points along rays from centroid
    const angleStep = (2 * Math.PI) / (numSectors - 1);
    for (let i = 1; i < numSectors; i++) {
      const angle = i * angleStep;
      const distance = Math.random() * 0.4 + 0.3; // 30-70% distance from centroid to edge

      // Start with a point along the ray
      let point = {
        x: centroid.x + Math.cos(angle) * 1000, // large enough to be outside
        y: centroid.y + Math.sin(angle) * 1000
      };

      // Intersect with polygon edges to find boundary
      let edgePoint = null;
      let minDist = Infinity;

      // Check intersection with each edge
      for (let j = 0; j < convertedPoints.length; j++) {
        const nextIdx = (j + 1) % convertedPoints.length;
        const edgeStart = convertedPoints[j];
        const edgeEnd = convertedPoints[nextIdx];

        // Simple line-line intersection
        const intersection = lineIntersection(
          centroid.x, centroid.y, point.x, point.y,
          edgeStart.x, edgeStart.y, edgeEnd.x, edgeEnd.y
        );

        if (intersection) {
          const dist = distance2D(centroid.x, centroid.y, intersection.x, intersection.y);
          if (dist < minDist) {
            minDist = dist;
            edgePoint = intersection;
          }
        }
      }

      if (edgePoint) {
        // Place point between centroid and edge
        sectorPoints.push({
          x: centroid.x + (edgePoint.x - centroid.x) * distance,
          y: centroid.y + (edgePoint.y - centroid.y) * distance
        });
      }
    }

    // Generate random "health" status for each sector
    const healthStates = Object.keys(HEALTH_STATES);

    // Create the sectors with random health states
    const newSectors = sectorPoints.map((point, index) => {
      // Randomly assign health status, with higher probability for healthy
      const randomStatus = Math.random();
      let healthStatus;

      if (randomStatus < 0.3) {
        healthStatus = 'HEALTHY';
      } else if (randomStatus < 0.45) {
        healthStatus = 'WATER_NEEDED';
      } else if (randomStatus < 0.6) {
        healthStatus = 'NUTRIENT_DEFICIENT';
      } else if (randomStatus < 0.75) {
        healthStatus = 'WEED_CONTROL';
      } else if (randomStatus < 0.9) {
        healthStatus = 'INSECTS';
      } else {
        healthStatus = 'DISEASE';
      }

      return {
        id: `sector-${index}`,
        centroid: point,
        health: healthStatus,
        data: {
          moisture: Math.floor(Math.random() * 100),
          temperature: Math.floor(Math.random() * 15) + 20,
          nutrientLevel: Math.floor(Math.random() * 100),
          lastUpdated: new Date().toISOString()
        }
      };
    });

    setSectors(newSectors);

    // Create a grid of points across the SVG area to form Voronoi cells
    const cellSize = 10; // Resolution of the grid
    const viewBoxParts = svgViewBox.split(' ').map(Number);
    const svgWidth = viewBoxParts[2];
    const svgHeight = viewBoxParts[3];

    // Map each point to nearest sector center
    const cells = {};
    newSectors.forEach(sector => {
      cells[sector.id] = {
        sector: sector,
        points: []
      };
    });

    // For each point in grid, find closest sector center
    for (let x = 0; x < svgWidth; x += cellSize) {
      for (let y = 0; y < svgHeight; y += cellSize) {
        const point = { x, y };

        // Skip if outside main polygon
        if (!isPointInPolygon(point, convertedPoints)) continue;

        // Find closest sector
        let closestSector = null;
        let minDist = Infinity;

        newSectors.forEach(sector => {
          const dist = distance2D(point.x, point.y, sector.centroid.x, sector.centroid.y);
          if (dist < minDist) {
            minDist = dist;
            closestSector = sector;
          }
        });

        if (closestSector) {
          cells[closestSector.id].points.push(point);
        }
      }
    }

    setVoronoiCells(cells);
    setLoading(false);
  }, [convertToSvgCoords, calculateCentroid, lineIntersection, distance2D, isPointInPolygon, params.polygonData, svgViewBox]);

  // Handle sector selection
  const handleSectorPress = useCallback((sector) => {
    setSelectedSector(sector);
  }, []);

  // Generate SVG elements for the farm visualization
  const renderFarmVisualization = useCallback(() => {
    if (!svgPoints.length || !sectors.length || Object.keys(voronoiCells).length === 0) {
      return null;
    }

    const polygonPointsString = svgPoints.map(p => `${p.x},${p.y}`).join(' ');

    return (
      <>
        {/* Render main farm boundary */}
        <SvgPolygon
          points={polygonPointsString}
          fill="transparent"
          stroke="white"
          strokeWidth="5"
        />

        {/* Render cells (mini rectangles for each grid point, grouped by sector) */}
        {Object.values(voronoiCells).map((cell) => (
          <React.Fragment key={cell.sector.id}>
            {cell.points.map((point, i) => (
              <SvgPolygon
                key={`${cell.sector.id}-point-${i}`}
                points={`${point.x},${point.y} ${point.x + 10},${point.y} ${point.x + 10},${point.y + 10} ${point.x},${point.y + 10}`}
                fill={HEALTH_STATES[cell.sector.health].color}
                fillOpacity="0.8"
                stroke="none"
              />
            ))}
          </React.Fragment>
        ))}

        {/* Render sector centers with numbers */}
        {sectors.map((sector, index) => (
          <Circle
            key={sector.id}
            cx={sector.centroid.x}
            cy={sector.centroid.y}
            r="15"
            fill="white"
            stroke="black"
            strokeWidth="2"
          />
        ))}

        {/* Render sector numbers */}
        {sectors.map((sector, index) => (
          <SvgText
            key={`${sector.id}-text`}
            x={sector.centroid.x}
            y={sector.centroid.y + 5}
            fontSize="18"
            fontWeight="bold"
            fill="black"
            textAnchor="middle"
          >
            {index + 1}
          </SvgText>
        ))}
      </>
    );
  }, [sectors, svgPoints, voronoiCells]);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-background justify-center items-center">
        <View className="items-center">
          <ActivityIndicator size="large" color="#00b890" />
          <Text className="mt-3 text-primary text-lg">Processing farm sectors...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'left', 'right']}>
      <ScrollView>
        {/* Header */}
        <View className="bg-surface/80 px-4 py-5">
          <Text className="text-white text-xl font-psemibold">
            Farm Analysis
          </Text>
          <Text className="text-gray-400 text-sm font-pregular mt-1">
            Real-time monitoring and health status
          </Text>
        </View>

        {/* SVG Heatmap */}
        <View className="h-80 bg-surface/60 rounded-3xl mx-3 mt-4 mb-2 overflow-hidden border border-surface">
          <Svg
            ref={svgRef}
            width="100%"
            height="100%"
            viewBox={svgViewBox}
            className="rounded-3xl"
          >
            {renderFarmVisualization()}
          </Svg>
        </View>

        {/* Legend */}
        <View className="bg-surface/60 rounded-2xl mx-3 p-4 border border-surface">
          <Text className="text-white font-pmedium text-base mb-3">
            Health Indicators
          </Text>
          <View className="flex-row flex-wrap">
            {Object.entries(HEALTH_STATES).map(([key, value]) => (
              <View key={key} className="w-1/2 flex-row items-center mb-2.5 pr-2">
                <View 
                  className="w-3 h-3 rounded-full mr-2" 
                  style={{ backgroundColor: value.color }} 
                />
                <Text className="text-gray-300 text-sm font-pregular">{value.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Sector Details */}
        <View className="px-3 py-4">
          <Text className="text-white font-pmedium text-base mb-3 px-1">
            Sector Overview
          </Text>

          {/* Sector Stats */}
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            className="flex-row"
          >
            {sectors.map((sector, index) => (
              <TouchableOpacity
                key={sector.id}
                className={`
                  bg-surface/60 
                  rounded-2xl 
                  p-4 
                  mr-3 
                  w-36
                  border border-surface
                  ${selectedSector?.id === sector.id ? 'bg-surface/90' : ''}
                `}
                onPress={() => handleSectorPress(sector)}
              >
                <View className="flex-row justify-between items-center mb-3">
                  <View className="bg-surface/90 w-7 h-7 rounded-full justify-center items-center">
                    <Text className="text-primary font-pbold">{index + 1}</Text>
                  </View>
                  <MaterialCommunityIcons
                    name={HEALTH_STATES[sector.health].icon}
                    size={22}
                    color={HEALTH_STATES[sector.health].color}
                  />
                </View>
                <Text className="text-white font-pmedium text-sm mb-2">
                  {HEALTH_STATES[sector.health].label}
                </Text>
                <View className="space-y-1">
                  <View className="flex-row justify-between">
                    <Text className="text-gray-400 text-xs font-pregular">Moisture</Text>
                    <Text className="text-gray-300 text-xs font-pmedium">{sector.data.moisture}%</Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-gray-400 text-xs font-pregular">Temperature</Text>
                    <Text className="text-gray-300 text-xs font-pmedium">{sector.data.temperature}°C</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default RouteScreen;