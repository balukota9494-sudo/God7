import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { getRouteColorKey, SafeRoute } from '@/utils/safety';

type RouteCardProps = {
  route: SafeRoute;
  selected: boolean;
  recommended: boolean;
  onPress: () => void;
};

export function RouteCard({ route, selected, recommended, onPress }: RouteCardProps) {
  const colors = useColors();
  const routeColor = colors[getRouteColorKey(route.id)];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      testID={`route-card-${route.id}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: selected ? routeColor : colors.border,
          borderWidth: selected ? 1.5 : 1,
          opacity: pressed ? 0.92 : 1,
          transform: [{ scale: pressed ? 0.99 : 1 }],
        },
      ]}
    >
      <View style={styles.mainRow}>
        <View style={[styles.routeLine, { backgroundColor: routeColor }]} />
        <View style={styles.copy}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: colors.foreground }]}>{route.name}</Text>
            {recommended ? (
              <View style={[styles.recommended, { backgroundColor: colors.safeTint }]}>
                <Ionicons name="sparkles" size={11} color={colors.routeSafe} />
                <Text style={[styles.recommendedText, { color: colors.routeSafe }]}>PICK</Text>
              </View>
            ) : null}
          </View>
          <Text style={[styles.description, { color: colors.mutedForeground }]} numberOfLines={1}>
            {route.description}
          </Text>
        </View>
        <View style={[styles.scoreCircle, { borderColor: routeColor }]}>
          <Text style={[styles.scoreValue, { color: routeColor }]}>{route.safetyScore}</Text>
          <Text style={[styles.scoreOutOf, { color: colors.mutedForeground }]}>/100</Text>
        </View>
      </View>
      <View style={styles.metricsRow}>
        <View style={[styles.metric, { backgroundColor: colors.secondary }]}>
          <Ionicons name="navigate-outline" size={13} color={colors.mutedForeground} />
          <Text style={[styles.metricText, { color: colors.foreground }]}>{route.distance}</Text>
        </View>
        <View style={[styles.metric, { backgroundColor: colors.secondary }]}>
          <Ionicons name="time-outline" size={13} color={colors.mutedForeground} />
          <Text style={[styles.metricText, { color: colors.foreground }]}>{route.eta} min</Text>
        </View>
        {selected ? (
          <Ionicons
            name="checkmark-circle"
            size={21}
            color={routeColor}
            style={styles.selectedCheck}
          />
        ) : null}
      </View>
      {selected ? (
        <View style={[styles.factors, { borderTopColor: colors.border }]}>
          {route.factors.map((factor) => (
            <View key={factor.label} style={styles.factorRow}>
              <Text style={[styles.factorLabel, { color: colors.mutedForeground }]}>
                {factor.label}
              </Text>
              <View style={[styles.factorTrack, { backgroundColor: colors.muted }]}>
                <View
                  style={[
                    styles.factorFill,
                    { width: `${factor.score}%`, backgroundColor: routeColor },
                  ]}
                />
              </View>
              <Text style={[styles.factorScore, { color: colors.foreground }]}>{factor.score}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 19,
    padding: 15,
    marginBottom: 11,
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  routeLine: {
    width: 4,
    height: 40,
    borderRadius: 4,
  },
  copy: {
    flex: 1,
    gap: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 7,
  },
  title: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
  },
  description: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
  },
  recommended: {
    borderRadius: 7,
    paddingHorizontal: 6,
    paddingVertical: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  recommendedText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 8,
    letterSpacing: 0.6,
  },
  scoreCircle: {
    width: 51,
    height: 51,
    borderRadius: 26,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  scoreValue: {
    fontFamily: 'Inter_700Bold',
    fontSize: 17,
  },
  scoreOutOf: {
    fontFamily: 'Inter_500Medium',
    fontSize: 8,
    alignSelf: 'flex-end',
    marginBottom: 11,
    marginLeft: 1,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 11,
  },
  metric: {
    borderRadius: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  metricText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
  },
  selectedCheck: {
    marginLeft: 'auto',
  },
  factors: {
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 13,
    paddingTop: 12,
    gap: 8,
  },
  factorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  factorLabel: {
    width: 125,
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
  },
  factorTrack: {
    flex: 1,
    height: 5,
    borderRadius: 5,
    overflow: 'hidden',
  },
  factorFill: {
    height: '100%',
    borderRadius: 5,
  },
  factorScore: {
    width: 22,
    textAlign: 'right',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
  },
});
