import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Polygon, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const TRACTOR_WIDTH = 3; // Width of tractor in meters
const OVERLAP_MARGIN = 0.1; // 10% overlap between passes
const TURNING_RADIUS = 3.5; // Minimum turning radius in meters

const TractorRoute = () => {
  const params = useLocalSearchParams();
  const [polygonPoints, setPolygonPoints] = useState([]);
  const [plowLines, setPlowLines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [region, setRegion] = useState(null);
  const mapRef = useRef(null);

  // Calculate bearing between two points
  const calculateBearing = (start, end) => {
    const startLat = start.latitude * Math.PI / 180;
    const startLng = start.longitude * Math.PI / 180;
    const endLat = end.latitude * Math.PI / 180;
    const endLng = end.longitude * Math.PI / 180;

    const y = Math.sin(endLng - startLng) * Math.cos(endLat);
    const x = Math.cos(startLat) * Math.sin(endLat) -
              Math.sin(startLat) * Math.cos(endLat) * Math.cos(endLng - startLng);
    
    return Math.atan2(y, x) * 180 / Math.PI;
  };

  // Calculate distance between two points in meters
  const calculateDistance = (point1, point2) => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = point1.latitude * Math.PI / 180;
    const φ2 = point2.latitude * Math.PI / 180;
    const Δφ = (point2.latitude - point1.latitude) * Math.PI / 180;
    const Δλ = (point2.longitude - point1.longitude) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  };

  // Generate parallel lines for plowing
  const generatePlowLines = (points) => {
    // Find the longest edge to determine optimal plowing direction
    let maxDistance = 0;
    let optimalStart = points[0];
    let optimalEnd = points[0];
    let optimalIndex = 0;
  
    for (let i = 0; i < points.length; i++) {
      const nextIndex = (i + 1) % points.length;
      const distance = calculateDistance(points[i], points[nextIndex]);
      if (distance > maxDistance) {
        maxDistance = distance;
        optimalStart = points[i];
        optimalEnd = points[nextIndex];
        optimalIndex = i;
      }
    }
  
    // Calculate perpendicular direction for parallel lines
    const bearing = calculateBearing(optimalStart, optimalEnd);
    const perpendicularBearing = (bearing + 90) % 360;
    
    // Calculate effective width between passes
    const effectiveWidth = TRACTOR_WIDTH * (1 - OVERLAP_MARGIN);
    
    // Find perpendicular bounds of the field
    let maxPerpendicularDist = 0;
    const centerPoint = {
      latitude: (optimalStart.latitude + optimalEnd.latitude) / 2,
      longitude: (optimalStart.longitude + optimalEnd.longitude) / 2
    };
  
    // Find maximum perpendicular distance from center line
    points.forEach(point => {
      const dist = Math.abs(
        calculatePerpendicularDistance(
          point,
          optimalStart,
          optimalEnd
        )
      );
      maxPerpendicularDist = Math.max(maxPerpendicularDist, dist);
    });
  
    // Generate parallel lines
    const lines = [];
    let currentDist = -maxPerpendicularDist;
    let isForward = true;
  
    while (currentDist <= maxPerpendicularDist) {
      // Calculate start and end points of current line
      const lineStart = calculateOffsetPoint(optimalStart, perpendicularBearing, currentDist);
      const lineEnd = calculateOffsetPoint(optimalEnd, perpendicularBearing, currentDist);
      
      // Check if line intersects with polygon
      if (isLineInPolygon([lineStart, lineEnd], points)) {
        // Clip line to polygon boundaries
        const clippedLine = clipLineToPolygon([lineStart, lineEnd], points);
        if (clippedLine) {
          lines.push(isForward ? clippedLine : [clippedLine[1], clippedLine[0]]);
        }
      }
      
      currentDist += effectiveWidth;
      isForward = !isForward; // Alternate direction for serpentine pattern
    }
  
    return lines;
  };
  
  // Calculate perpendicular distance from point to line
  const calculatePerpendicularDistance = (point, lineStart, lineEnd) => {
    const A = point.latitude - lineStart.latitude;
    const B = point.longitude - lineStart.longitude;
    const C = lineEnd.latitude - lineStart.latitude;
    const D = lineEnd.longitude - lineStart.longitude;
  
    return (A * D - C * B) / Math.sqrt(C * C + D * D);
  };
  
  // Check if line segment intersects with polygon
  const isLineInPolygon = (line, polygonPoints) => {
    const [start, end] = line;
    const midPoint = {
      latitude: (start.latitude + end.latitude) / 2,
      longitude: (start.longitude + end.longitude) / 2
    };
    
    // Check if midpoint is inside polygon using ray-casting algorithm
    let inside = false;
    for (let i = 0, j = polygonPoints.length - 1; i < polygonPoints.length; j = i++) {
      const xi = polygonPoints[i].latitude;
      const yi = polygonPoints[i].longitude;
      const xj = polygonPoints[j].latitude;
      const yj = polygonPoints[j].longitude;
      
      const intersect = ((yi > midPoint.longitude) !== (yj > midPoint.longitude)) &&
        (midPoint.latitude < (xj - xi) * (midPoint.longitude - yi) / (yj - yi) + xi);
      
      if (intersect) inside = !inside;
    }
    
    return inside;
  };
  
  // Clip line to polygon boundaries
  const clipLineToPolygon = (line, polygonPoints) => {
    const [lineStart, lineEnd] = line;
    let intersections = [];
    
    // Find all intersections with polygon edges
    for (let i = 0; i < polygonPoints.length; i++) {
      const j = (i + 1) % polygonPoints.length;
      const intersection = findIntersection(
        lineStart,
        lineEnd,
        polygonPoints[i],
        polygonPoints[j]
      );
      if (intersection) {
        intersections.push(intersection);
      }
    }
    
    if (intersections.length >= 2) {
      // Sort intersections by distance from line start
      intersections.sort((a, b) => 
        calculateDistance(lineStart, a) - calculateDistance(lineStart, b)
      );
      return [intersections[0], intersections[intersections.length - 1]];
    }
    
    return null;
  };
  
  // Find intersection of two line segments
  const findIntersection = (p1, p2, p3, p4) => {
    const x1 = p1.latitude;
    const y1 = p1.longitude;
    const x2 = p2.latitude;
    const y2 = p2.longitude;
    const x3 = p3.latitude;
    const y3 = p3.longitude;
    const x4 = p4.latitude;
    const y4 = p4.longitude;
  
    const den = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (den === 0) return null;
  
    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / den;
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / den;
  
    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
      return {
        latitude: x1 + t * (x2 - x1),
        longitude: y1 + t * (y2 - y1)
      };
    }
    
    return null;
  };
  
  // Update the useEffect to include automatic zoom
  useEffect(() => {
    if (params.polygonData) {
      const points = JSON.parse(params.polygonData);
      setPolygonPoints(points);
  
      // Calculate the center and zoom level for the farm
      const lats = points.map(p => p.latitude);
      const lngs = points.map(p => p.longitude);
      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);
      const minLng = Math.min(...lngs);
      const maxLng = Math.max(...lngs);
  
      // Add padding to the bounds
      const latPadding = (maxLat - minLat) * 0.2;
      const lngPadding = (maxLng - minLng) * 0.2;
  
      const initialRegion = {
        latitude: (minLat + maxLat) / 2,
        longitude: (minLng + maxLng) / 2,
        latitudeDelta: (maxLat - minLat) + latPadding,
        longitudeDelta: (maxLng - minLng) + lngPadding,
      };
      setRegion(initialRegion);
  
      // Animate to the region after a short delay
      setTimeout(() => {
        mapRef.current?.animateToRegion(initialRegion, 1000);
      }, 100);
  
      // Generate plow lines
      const lines = generatePlowLines(points);
      setPlowLines(lines);
      setLoading(false);
    }
  }, [params.polygonData]);
  
  // Update the return JSX to only show green lines
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerContainer}>
        <LinearGradient
          colors={['#0f1924', '#182635']}
          style={styles.headerGradient}
        >
          <Text style={styles.headerTitle}>Tractor Route Plan</Text>
          <Text style={styles.headerSubtitle}>
            Follow the green lines for optimal coverage
          </Text>
        </LinearGradient>
      </View>

      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={PROVIDER_GOOGLE}
          initialRegion={region}
          mapType="satellite"
        >
          <Polygon
            coordinates={polygonPoints}
            strokeColor="#00ffcc"
            fillColor="rgba(0, 255, 204, 0.1)"
            strokeWidth={2}
          />
          {plowLines.map((line, index) => (
            <Polyline
              key={`line-${index}`}
              coordinates={line}
              strokeColor="#000000"
              strokeWidth={3}
              lineDashPattern={[0]}
            />
          ))}
        </MapView>
      </View>

      <View style={styles.infoContainer}>
        <View style={styles.infoItem}>
          <Ionicons name="information-circle-outline" size={20} color="#00ffcc" />
          <Text style={styles.infoText}>
            Tractor width: {TRACTOR_WIDTH}m
          </Text>
        </View>
        <View style={styles.infoItem}>
          <Ionicons name="git-commit-outline" size={20} color="#00ffcc" />
          <Text style={styles.infoText}>
            Overlap: {OVERLAP_MARGIN * 100}%
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f1924',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f1924',
  },
  loadingText: {
    marginTop: 16,
    color: '#8b9eb5',
    fontSize: 16,
  },
  headerContainer: {
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  headerGradient: {
    paddingVertical: 18,
    paddingHorizontal: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    marginTop: 6,
  },
  mapContainer: {
    flex: 1,
    margin: 8,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  infoContainer: {
    padding: 16,
    backgroundColor: '#182635',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: {
    color: '#8b9eb5',
    marginLeft: 8,
    fontSize: 14,
  },
});

export default TractorRoute;


// Move calculateOffsetPoint inside the component
const calculateOffsetPoint = (start, bearing, distance) => {
const R = 6371e3;
const δ = distance / R;
const θ = bearing * Math.PI / 180;
const φ1 = start.latitude * Math.PI / 180;
const λ1 = start.longitude * Math.PI / 180;

const φ2 = Math.asin(
  Math.sin(φ1) * Math.cos(δ) +
  Math.cos(φ1) * Math.sin(δ) * Math.cos(θ)
);

const λ2 = λ1 + Math.atan2(
  Math.sin(θ) * Math.sin(δ) * Math.cos(φ1),
  Math.cos(δ) - Math.sin(φ1) * Math.sin(φ2)
);

return {
  latitude: φ2 * 180 / Math.PI,
  longitude: λ2 * 180 / Math.PI
};
};