import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path, Polyline, Rect } from 'react-native-svg';
import { useColors } from '@/hooks/useColors';
import { getRouteColorKey, RouteId } from '@/utils/safety';

type RouteMapProps = {
  selectedRoute?: RouteId;
  showAllRoutes?: boolean;
  height?: number;
};

const routeLines: Record<RouteId, string> = {
  safe: '24,166 70,146 91,119 138,119 157,92 192,83 215,55 272,35 322,31',
  quick: '24,166 70,153 114,145 155,125 183,111 214,80 247,61 272,35 322,31',
  steady: '24,166 67,145 95,147 124,124 151,125 176,99 211,90 238,60 272,35 322,31',
};

export function RouteMap({
  selectedRoute = 'safe',
  showAllRoutes = false,
  height = 218,
}: RouteMapProps) {
  const colors = useColors();
  const colorFor = (id: RouteId) => colors[getRouteColorKey(id)];
  const ids: RouteId[] = ['safe', 'quick', 'steady'];

  return (
    <View style={[styles.container, { height, backgroundColor: colors.mapSurface }]}>
      <Svg
        width="100%"
        height="100%"
        viewBox="0 0 360 200"
        preserveAspectRatio="xMidYMid slice"
        accessibilityLabel="Schematic map showing three possible routes"
      >
        <Rect x="0" y="0" width="360" height="200" fill={colors.mapSurface} />
        <Path d="M0 22H360M0 64H360M0 105H360M0 150H360M0 187H360" stroke={colors.mapRoad} strokeWidth="2" />
        <Path d="M35 0V200M91 0V200M151 0V200M211 0V200M271 0V200M329 0V200" stroke={colors.mapRoad} strokeWidth="2" />
        <Path d="M-10 83C42 75 55 93 97 81S163 67 214 78s91 12 151-1" stroke={colors.mapRoad} strokeWidth="5" fill="none" />
        <Path d="M-10 126C39 113 75 132 123 118s106-10 144 3 63 8 107-1" stroke={colors.mapRoad} strokeWidth="5" fill="none" />
        <Path d="M0 177C61 157 102 181 151 163s100-14 153-4 40 7 65 1" stroke={colors.mapRoad} strokeWidth="5" fill="none" />
        <Rect x="112" y="18" width="28" height="20" rx="5" fill={colors.mapPark} />
        <Rect x="222" y="112" width="34" height="20" rx="5" fill={colors.mapPark} />
        <Rect x="43" y="36" width="24" height="17" rx="5" fill={colors.mapPark} />
        <Rect x="288" y="129" width="34" height="21" rx="5" fill={colors.mapPark} />
        <Path d="M18 18h57M278 166h46M190 19h51" stroke={colors.mapRoad} strokeWidth="1" />
        {ids.map((id) => (
          <Polyline
            key={id}
            points={routeLines[id]}
            fill="none"
            stroke={colorFor(id)}
            strokeWidth={selectedRoute === id ? 7 : showAllRoutes ? 4 : 0}
            strokeOpacity={selectedRoute === id ? 1 : 0.62}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
        <Circle cx="24" cy="166" r="9" fill={colors.foreground} stroke={colors.card} strokeWidth="4" />
        <Circle cx="322" cy="31" r="10" fill={colors.accent} stroke={colors.card} strokeWidth="4" />
      </Svg>
      <View style={[styles.mapTopLabel, { backgroundColor: colors.card }]}>
        <Ionicons name="map-outline" size={12} color={colors.mutedForeground} />
        <Text style={[styles.mapLabelText, { color: colors.mutedForeground }]}>
          SCHEMATIC · DEMO AREA
        </Text>
      </View>
      <View style={[styles.startTag, { backgroundColor: colors.card }]}>
        <View style={[styles.legendDot, { backgroundColor: colors.foreground }]} />
        <Text style={[styles.mapTagText, { color: colors.foreground }]}>START</Text>
      </View>
      <View style={[styles.destinationTag, { backgroundColor: colors.card }]}>
        <View style={[styles.legendDot, { backgroundColor: colors.accent }]} />
        <Text style={[styles.mapTagText, { color: colors.foreground }]}>DESTINATION</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
  },
  mapTopLabel: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    gap: 5,
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 12,
  },
  mapLabelText: {
    fontSize: 9,
    letterSpacing: 0.8,
    fontFamily: 'Inter_700Bold',
  },
  startTag: {
    position: 'absolute',
    left: 8,
    bottom: 9,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 10,
    flexDirection: 'row',
    gap: 5,
    alignItems: 'center',
  },
  destinationTag: {
    position: 'absolute',
    right: 8,
    top: 38,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 10,
    flexDirection: 'row',
    gap: 5,
    alignItems: 'center',
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  mapTagText: {
    fontSize: 9,
    letterSpacing: 0.6,
    fontFamily: 'Inter_700Bold',
  },
});
