import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { useColors } from '@/hooks/useColors';

type MapPickerSheetProps = {
  visible: boolean;
  onClose: () => void;
  onSelect: (place: string) => void;
};

const places = [
  { name: 'Central Station', left: '18%' as `${number}%`, top: '60%' as `${number}%` },
  { name: 'Student Union', left: '57%' as `${number}%`, top: '35%' as `${number}%` },
  { name: 'City Library', left: '72%' as `${number}%`, top: '67%' as `${number}%` },
];

export function MapPickerSheet({ visible, onClose, onSelect }: MapPickerSheetProps) {
  const colors = useColors();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable
          accessibilityLabel="Close map picker"
          onPress={onClose}
          style={StyleSheet.absoluteFill}
        />
        <SafeAreaView
          edges={['bottom']}
          style={[styles.sheet, { backgroundColor: colors.background }]}
        >
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text style={[styles.title, { color: colors.foreground }]}>Choose on map</Text>
              <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
                Schematic demo area · tap a place
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              onPress={onClose}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={22} color={colors.foreground} />
            </Pressable>
          </View>
          <View style={[styles.map, { backgroundColor: colors.mapSurface }]}>
            <Svg width="100%" height="100%" viewBox="0 0 360 250" style={StyleSheet.absoluteFill}>
              <Rect x="0" y="0" width="360" height="250" fill={colors.mapSurface} />
              <Path d="M0 45H360M0 105H360M0 166H360M0 217H360" stroke={colors.mapRoad} strokeWidth="3" />
              <Path d="M36 0V250M104 0V250M173 0V250M245 0V250M318 0V250" stroke={colors.mapRoad} strokeWidth="3" />
              <Path d="M-10 194 91 144 152 157 232 94 367 34" fill="none" stroke={colors.routeSafe} strokeWidth="5" strokeLinecap="round" strokeDasharray="7 7" />
              <Circle cx="104" cy="91" r="22" fill={colors.safeTint} />
              <Circle cx="288" cy="191" r="19" fill={colors.safeTint} />
              <Circle cx="56" cy="34" r="17" fill={colors.safeTint} />
            </Svg>
            {places.map((place) => (
              <Pressable
                key={place.name}
                accessibilityRole="button"
                accessibilityLabel={`Choose ${place.name}`}
                testID={`map-place-${place.name.toLowerCase().replaceAll(' ', '-')}`}
                onPress={() => onSelect(place.name)}
                style={({ pressed }) => [
                  styles.pinButton,
                  {
                    left: place.left,
                    top: place.top,
                    backgroundColor: colors.card,
                    borderColor: colors.routeSafe,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                <Ionicons name="location" size={13} color={colors.routeSafe} />
                <Text style={[styles.pinText, { color: colors.foreground }]}>{place.name}</Text>
              </Pressable>
            ))}
          </View>
          <View style={[styles.note, { backgroundColor: colors.safeTint }]}>
            <Ionicons name="information-circle-outline" size={17} color={colors.routeSafe} />
            <Text style={[styles.noteText, { color: colors.routeSafe }]}>
              Map places and route lines are illustrative. Safety values use demo data.
            </Text>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(10, 24, 18, 0.45)',
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 8,
    minHeight: 520,
  },
  handle: {
    width: 38,
    height: 4,
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 18,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerCopy: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 21,
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
  },
  closeButton: {
    padding: 4,
  },
  map: {
    height: 300,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
  },
  pinButton: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 7,
    paddingHorizontal: 9,
    borderRadius: 13,
    borderWidth: 1,
    maxWidth: 150,
  },
  pinText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
  },
  note: {
    marginTop: 13,
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  noteText: {
    flex: 1,
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    lineHeight: 16,
  },
});
