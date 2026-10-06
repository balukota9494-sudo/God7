import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Keyboard,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { MapPickerSheet } from '@/components/MapPickerSheet';
import { RouteCard } from '@/components/RouteCard';
import { RouteMap } from '@/components/RouteMap';
import { SafeCircleSheet, TrustedContact } from '@/components/SafeCircleSheet';
import { useColors } from '@/hooks/useColors';
import {
  buildRoutes,
  getRecommendedRoute,
  RouteId,
  SafeRoute,
  safetyFactors,
  SafetyPreference,
  safetyPreferences,
  TravelMode,
  travelModes,
} from '@/utils/safety';

const CONTACTS_KEY = '@saferoute-ai/trusted-circle-v1';
type AppStage = 'planner' | 'routes' | 'journey';

const demoDestinations = ['Central Station', 'Student Union', 'City Library'];

const journeyInstructions: Record<RouteId, string[]> = {
  safe: [
    'Continue along the main street. Open shops and well-lit corners are on this stretch.',
    'At the public square, stay on the main road and keep to the marked crossing.',
    'Turn right at the campus plaza. Your destination is ahead on the left.',
  ],
  quick: [
    'Follow the direct lane ahead. It is shorter, with fewer open businesses nearby.',
    'At the next crossing, follow the marked road toward the station.',
    'Continue straight to the destination entrance.',
  ],
  steady: [
    'Continue through the market corridor. Several open places are along this stretch.',
    'Keep to the boulevard and cross at the signal near the public square.',
    'Turn left at the campus plaza. Your destination is ahead.',
  ],
};

function triggerHaptic() {
  void Haptics.selectionAsync().catch(() => undefined);
}

function ModeButton({
  mode,
  active,
  onPress,
}: {
  mode: (typeof travelModes)[number];
  active: boolean;
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      testID={`travel-mode-${mode.id}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.modeButton,
        {
          backgroundColor: active ? colors.deepGreen : colors.card,
          borderColor: active ? colors.deepGreen : colors.border,
          opacity: pressed ? 0.82 : 1,
        },
      ]}
    >
      <Ionicons
        name={mode.icon}
        size={17}
        color={active ? colors.lime : colors.mutedForeground}
      />
      <Text style={[styles.modeLabel, { color: active ? colors.primaryForeground : colors.foreground }]}>
        {mode.label}
      </Text>
    </Pressable>
  );
}

function PreferenceButton({
  preference,
  active,
  onPress,
}: {
  preference: (typeof safetyPreferences)[number];
  active: boolean;
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      testID={`safety-preference-${preference.id}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.preferenceButton,
        {
          backgroundColor: active ? colors.safeTint : colors.card,
          borderColor: active ? colors.routeSafe : colors.border,
          opacity: pressed ? 0.84 : 1,
        },
      ]}
    >
      <Ionicons
        name={preference.icon}
        size={17}
        color={active ? colors.routeSafe : colors.mutedForeground}
      />
      <Text style={[styles.preferenceLabel, { color: active ? colors.routeSafe : colors.foreground }]}>
        {preference.label}
      </Text>
    </Pressable>
  );
}

function PlannerField({
  title,
  value,
  onChangeText,
  placeholder,
  icon,
  accessibilityLabel,
  trailing,
  onSubmitEditing,
}: {
  title: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  icon: 'locate' | 'location';
  accessibilityLabel: string;
  trailing?: React.ReactNode;
  onSubmitEditing?: () => void;
}) {
  const colors = useColors();
  return (
    <View style={styles.fieldRow}>
      <View style={styles.fieldIconColumn}>
        <View
          style={[
            styles.fieldIcon,
            {
              backgroundColor: icon === 'locate' ? colors.safeTint : colors.accentTint,
            },
          ]}
        >
          <Ionicons
            name={icon === 'locate' ? 'navigate' : 'location'}
            size={15}
            color={icon === 'locate' ? colors.routeSafe : colors.routeQuick}
          />
        </View>
        {icon === 'locate' ? <View style={[styles.fieldConnector, { backgroundColor: colors.border }]} /> : null}
      </View>
      <View style={styles.fieldInputWrap}>
        <Text style={[styles.fieldTitle, { color: colors.mutedForeground }]}>{title}</Text>
        <TextInput
          accessibilityLabel={accessibilityLabel}
          testID={icon === 'locate' ? 'origin-input' : 'destination-input'}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.mutedForeground}
          returnKeyType={icon === 'locate' ? 'next' : 'done'}
          onSubmitEditing={onSubmitEditing}
          autoCapitalize="words"
          style={[styles.fieldInput, { color: colors.foreground }]}
        />
      </View>
      {trailing}
    </View>
  );
}

function ScoringSheet({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const colors = useColors();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <Pressable
          accessibilityLabel="Close scoring explanation"
          onPress={onClose}
          style={StyleSheet.absoluteFill}
        />
        <SafeAreaView
          edges={['bottom']}
          style={[styles.explainSheet, { backgroundColor: colors.background }]}
        >
          <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
          <View style={styles.explainHeader}>
            <View style={[styles.explainIcon, { backgroundColor: colors.safeTint }]}>
              <Ionicons name="analytics-outline" size={21} color={colors.routeSafe} />
            </View>
            <View style={styles.explainHeaderCopy}>
              <Text style={[styles.sheetTitle, { color: colors.foreground }]}>How the score works</Text>
              <Text style={[styles.sheetSubtitle, { color: colors.mutedForeground }]}>
                A transparent demo model, not a live safety feed
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              onPress={onClose}
              style={styles.sheetClose}
            >
              <Ionicons name="close" size={22} color={colors.foreground} />
            </Pressable>
          </View>
          <Text style={[styles.explainBody, { color: colors.mutedForeground }]}>
            Each route gets a weighted estimate from four example conditions. Scores are calculated on-device and change with your travel mode. They are not based on live crime, lighting, traffic, or emergency data.
          </Text>
          <View style={[styles.weightList, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {safetyFactors.map((factor, index) => (
              <View
                key={factor.label}
                style={[
                  styles.weightRow,
                  index < safetyFactors.length - 1 ? { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth } : null,
                ]}
              >
                <View style={[styles.weightDot, { backgroundColor: colors.routeSafe }]} />
                <Text style={[styles.weightLabel, { color: colors.foreground }]}>{factor.label}</Text>
                <Text style={[styles.weightValue, { color: colors.routeSafe }]}>{factor.weight}</Text>
              </View>
            ))}
          </View>
          <View style={[styles.modelFormula, { backgroundColor: colors.safeTint }]}>
            <Text style={[styles.formulaTitle, { color: colors.routeSafe }]}>Weighted model</Text>
            <Text style={[styles.formulaText, { color: colors.routeSafe }]}>
              Route score = sum of factor score × factor weight
            </Text>
          </View>
          <View style={styles.disclaimerRow}>
            <Ionicons name="warning-outline" size={17} color={colors.destructive} />
            <Text style={[styles.disclaimerText, { color: colors.mutedForeground }]}>
              A high score is not a safety guarantee. Use your judgment and local guidance.
            </Text>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

function SosSheet({
  visible,
  onClose,
  onCall,
  onShare,
}: {
  visible: boolean;
  onClose: () => void;
  onCall: () => void;
  onShare: () => void;
}) {
  const colors = useColors();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <Pressable
          accessibilityLabel="Close SOS options"
          onPress={onClose}
          style={StyleSheet.absoluteFill}
        />
        <SafeAreaView
          edges={['bottom']}
          style={[styles.explainSheet, { backgroundColor: colors.background }]}
        >
          <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
          <View style={styles.sosHeader}>
            <View style={[styles.sosIcon, { backgroundColor: colors.destructiveTint }]}>
              <Ionicons name="shield-half-outline" size={22} color={colors.destructive} />
            </View>
            <View style={styles.explainHeaderCopy}>
              <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Emergency options</Text>
              <Text style={[styles.sheetSubtitle, { color: colors.mutedForeground }]}>
                Choose what you need. Nothing is sent automatically.
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              onPress={onClose}
              style={styles.sheetClose}
            >
              <Ionicons name="close" size={22} color={colors.foreground} />
            </Pressable>
          </View>
          <View style={[styles.sosDisclosure, { backgroundColor: colors.destructiveTint }]}>
            <Text style={[styles.sosDisclosureText, { color: colors.destructive }]}>
              Demo notice: this app does not dispatch emergency services or monitor your trip in the background.
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            testID="call-emergency-services"
            onPress={onCall}
            style={({ pressed }) => [
              styles.callButton,
              { backgroundColor: colors.destructive, opacity: pressed ? 0.84 : 1 },
            ]}
          >
            <Ionicons name="call-outline" size={18} color={colors.destructiveForeground} />
            <Text style={[styles.callButtonText, { color: colors.destructiveForeground }]}>
              Open dialer · emergency number 112
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            testID="sos-share-location"
            onPress={onShare}
            style={({ pressed }) => [
              styles.secondaryAction,
              { borderColor: colors.border, backgroundColor: colors.card, opacity: pressed ? 0.82 : 1 },
            ]}
          >
            <Ionicons name="share-outline" size={17} color={colors.foreground} />
            <Text style={[styles.secondaryActionText, { color: colors.foreground }]}>
              Share trip details
            </Text>
          </Pressable>
          <Text style={[styles.sosFooter, { color: colors.mutedForeground }]}>
            The phone app opens for you to confirm a call. Emergency numbers vary by region.
          </Text>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

export default function SafeRouteScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [stage, setStage] = useState<AppStage>('planner');
  const [origin, setOrigin] = useState('Campus North Gate');
  const [originIsGps, setOriginIsGps] = useState(false);
  const [destination, setDestination] = useState('');
  const [mode, setMode] = useState<TravelMode>('walk');
  const [preference, setPreference] = useState<SafetyPreference>('safest');
  const [routes, setRoutes] = useState<SafeRoute[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<RouteId>('safe');
  const [journeyStep, setJourneyStep] = useState(0);
  const [formError, setFormError] = useState('');
  const [originError, setOriginError] = useState('');
  const [isFindingLocation, setIsFindingLocation] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [showSafeCircle, setShowSafeCircle] = useState(false);
  const [showScoring, setShowScoring] = useState(false);
  const [showSos, setShowSos] = useState(false);
  const [gpsCoordinates, setGpsCoordinates] = useState<string | null>(null);
  const [contacts, setContacts] = useState<TrustedContact[]>([]);
  const [contactsLoaded, setContactsLoaded] = useState(false);
  const [contactStorageError, setContactStorageError] = useState<string | null>(null);
  const [locationPermission, requestLocationPermission] = Location.useForegroundPermissions();

  const recommendedRoute = useMemo(
    () => (routes.length ? getRecommendedRoute(routes, preference) : undefined),
    [preference, routes],
  );
  const selectedRoute =
    routes.find((route) => route.id === selectedRouteId) ?? recommendedRoute ?? routes[0];
  const webTopInset = Platform.OS === 'web' ? Math.max(insets.top, 67) : 0;
  const bottomPadding =
    Platform.OS === 'web' ? Math.max(insets.bottom, 34) + 22 : Math.max(22, insets.bottom + 16);

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(CONTACTS_KEY)
      .then((stored) => {
        if (!mounted || !stored) return;
        const parsed: unknown = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          const valid = parsed.filter(
            (item): item is TrustedContact =>
              !!item &&
              typeof item === 'object' &&
              'id' in item &&
              'name' in item &&
              'contact' in item &&
              typeof item.id === 'string' &&
              typeof item.name === 'string' &&
              typeof item.contact === 'string',
          );
          setContacts(valid);
        }
      })
      .catch(() => {
        if (mounted) {
          setContactStorageError('Saved contacts could not be loaded. You can still use the share sheet.');
        }
      })
      .finally(() => {
        if (mounted) setContactsLoaded(true);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const handleGetLocation = async () => {
    Keyboard.dismiss();
    setOriginError('');
    setIsFindingLocation(true);
    try {
      if (Platform.OS === 'web') {
        if (!globalThis.navigator?.geolocation) {
          setOriginError('This browser does not provide location. Type a starting point instead.');
          setIsFindingLocation(false);
          return;
        }
        globalThis.navigator.geolocation.getCurrentPosition(
          (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            setGpsCoordinates(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
            setOrigin(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
            setOriginIsGps(true);
            setIsFindingLocation(false);
          },
          (error) => {
            setOriginError(
              error.code === error.PERMISSION_DENIED
                ? 'Location permission was declined. Type a starting point to continue.'
                : 'Could not get your location. Check your signal or type a starting point.',
            );
            setIsFindingLocation(false);
          },
          { enableHighAccuracy: true, timeout: 12000 },
        );
        return;
      }

      let granted = locationPermission?.granted ?? false;
      let canAskAgain = locationPermission?.canAskAgain ?? true;
      if (!granted) {
        const permission = await requestLocationPermission();
        granted = permission.granted;
        canAskAgain = permission.canAskAgain;
      }
      if (!granted) {
        setOriginError('Location permission is off. Type a starting point or enable location access.');
        if (!canAskAgain) {
          Alert.alert(
            'Location permission is off',
            'You can still enter a starting point manually, or open settings to enable location.',
            [
              { text: 'Not now', style: 'cancel' },
              { text: 'Open settings', onPress: () => void Linking.openSettings().catch(() => undefined) },
            ],
          );
        }
        setIsFindingLocation(false);
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const { latitude, longitude } = position.coords;
      const coords = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
      let placeLabel = coords;
      try {
        const places = await Location.reverseGeocodeAsync({ latitude, longitude });
        const place = places[0];
        const readable = [place?.name, place?.street, place?.district, place?.city]
          .filter((part): part is string => !!part)
          .filter((part, index, all) => all.indexOf(part) === index)
          .slice(0, 3);
        if (readable.length) placeLabel = readable.join(', ');
      } catch {
        placeLabel = coords;
      }
      setGpsCoordinates(coords);
      setOrigin(placeLabel);
      setOriginIsGps(true);
    } catch {
      setOriginError('Could not get your location. Type a starting point to continue.');
    } finally {
      setIsFindingLocation(false);
    }
  };

  const handleFindRoutes = () => {
    Keyboard.dismiss();
    setFormError('');
    if (!origin.trim()) {
      setFormError('Add a starting point or use your current location.');
      return;
    }
    if (!destination.trim()) {
      setFormError('Enter a destination, or choose a place on the map.');
      return;
    }
    const nextRoutes = buildRoutes(mode);
    const nextRecommended = getRecommendedRoute(nextRoutes, preference);
    setRoutes(nextRoutes);
    setSelectedRouteId(nextRecommended.id);
    setStage('routes');
    triggerHaptic();
  };

  const addContact = async (name: string, contact: string): Promise<boolean> => {
    if (!contactsLoaded) return false;
    const nextContacts = [
      ...contacts,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        name,
        contact,
      },
    ];
    try {
      await AsyncStorage.setItem(CONTACTS_KEY, JSON.stringify(nextContacts));
      setContacts(nextContacts);
      setContactStorageError(null);
      triggerHaptic();
      return true;
    } catch {
      setContactStorageError('Could not save this contact on your device. Please try again.');
      return false;
    }
  };

  const removeContact = async (id: string): Promise<void> => {
    const nextContacts = contacts.filter((contact) => contact.id !== id);
    try {
      await AsyncStorage.setItem(CONTACTS_KEY, JSON.stringify(nextContacts));
      setContacts(nextContacts);
      setContactStorageError(null);
    } catch {
      setContactStorageError('Could not update saved contacts. Please try again.');
    }
  };

  const shareTrip = async () => {
    const routeDetails = selectedRoute
      ? `${selectedRoute.name}, ${selectedRoute.distance}, about ${selectedRoute.eta} min, demo safety score ${selectedRoute.safetyScore}/100`
      : 'Route details will appear when you find a route.';
    const mapLink = gpsCoordinates
      ? `\nStarting location: https://maps.google.com/?q=${encodeURIComponent(gpsCoordinates)}`
      : '';
    const message = `SafeRoute AI trip\n${origin} → ${destination}\n${routeDetails}${mapLink}\n\nSafety values are illustrative demo estimates, not live incident reports.`;
    try {
      await Share.share({
        title: `SafeRoute AI trip to ${destination}`,
        message,
      });
      setShowSos(false);
    } catch {
      Alert.alert('Could not open sharing', 'Try again, or use your phone’s share options.');
    }
  };

  const handleCallEmergency = async () => {
    setShowSos(false);
    try {
      await Linking.openURL('tel:112');
    } catch {
      Alert.alert(
        'Could not open the dialer',
        'Use your phone’s emergency call option or dial the local emergency number.',
      );
    }
  };

  const openSafeCircle = () => {
    triggerHaptic();
    setShowSafeCircle(true);
  };

  const safeScrollStyle = [
    styles.scrollContent,
    {
      paddingTop: Platform.OS === 'web' ? webTopInset + 14 : 8,
      paddingBottom: bottomPadding,
    },
  ];

  const renderBrandHeader = (withCircle = true) => (
    <View style={styles.brandHeader}>
      <View style={styles.brand}>
        <View style={[styles.brandMark, { backgroundColor: colors.deepGreen }]}>
          <Ionicons name="shield-checkmark" size={19} color={colors.lime} />
        </View>
        <View style={styles.brandNameWrap}>
          <Text style={[styles.brandName, { color: colors.foreground }]}>SafeRoute</Text>
          <Text style={[styles.brandAI, { color: colors.routeSafe }]}>AI</Text>
        </View>
      </View>
      <View style={styles.headerRight}>
        {stage === 'journey' ? (
          <View style={[styles.livePill, { backgroundColor: colors.safeTint }]}>
            <View style={[styles.liveDot, { backgroundColor: colors.routeSafe }]} />
            <Text style={[styles.liveText, { color: colors.routeSafe }]}>DEMO TRIP</Text>
          </View>
        ) : (
          <View style={[styles.demoPill, { backgroundColor: colors.secondary }]}>
            <View style={[styles.demoDot, { backgroundColor: colors.routeQuick }]} />
            <Text style={[styles.demoLabel, { color: colors.mutedForeground }]}>DEMO DATA</Text>
          </View>
        )}
        {withCircle ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open SafeCircle"
            testID="open-safe-circle"
            onPress={openSafeCircle}
            style={({ pressed }) => [
              styles.headerCircleButton,
              { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.78 : 1 },
            ]}
          >
            <Ionicons name="people-outline" size={19} color={colors.foreground} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );

  const renderPlanner = () => (
    <KeyboardAwareScrollViewCompat
      style={styles.fill}
      contentContainerStyle={safeScrollStyle}
      keyboardShouldPersistTaps="handled"
      bottomOffset={72}
      keyboardDismissMode="interactive"
      showsVerticalScrollIndicator={false}
    >
      {renderBrandHeader()}
      <View style={styles.hero}>
        <View style={[styles.heroEyebrow, { backgroundColor: colors.safeTint }]}>
          <Ionicons name="navigate-circle-outline" size={14} color={colors.routeSafe} />
          <Text style={[styles.heroEyebrowText, { color: colors.routeSafe }]}>PERSONAL SAFETY ROUTING</Text>
        </View>
        <Text style={[styles.heroTitle, { color: colors.foreground }]}>
          Don’t just find the{'\n'}
          fastest route.{'\n'}
          <Text style={{ color: colors.routeSafe }}>Find the safest route.</Text>
        </Text>
        <Text style={[styles.heroSubtitle, { color: colors.mutedForeground }]}>
          Your destination matters. Your safety matters more.
        </Text>
      </View>

      <View style={[styles.plannerCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.plannerTopline}>
          <Text style={[styles.sectionEyebrow, { color: colors.mutedForeground }]}>PLAN YOUR TRIP</Text>
          <View style={[styles.editableTag, { backgroundColor: colors.secondary }]}>
            <Text style={[styles.editableTagText, { color: colors.mutedForeground }]}>EDITABLE DEMO START</Text>
          </View>
        </View>
        <PlannerField
          title="FROM"
          value={origin}
          onChangeText={(value) => {
            setOrigin(value);
            setOriginIsGps(false);
            setOriginError('');
          }}
          placeholder="Enter a starting point"
          accessibilityLabel="Starting location"
          icon="locate"
          trailing={
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={locationPermission?.granted ? 'Refresh current location' : 'Use current location'}
              testID="use-current-location"
              disabled={isFindingLocation}
              onPress={() => void handleGetLocation()}
              style={({ pressed }) => [
                styles.gpsButton,
                {
                  backgroundColor: colors.safeTint,
                  opacity: isFindingLocation || pressed ? 0.65 : 1,
                },
              ]}
            >
              <Ionicons
                name={isFindingLocation ? 'hourglass-outline' : 'locate-outline'}
                size={18}
                color={colors.routeSafe}
              />
            </Pressable>
          }
          onSubmitEditing={() => Keyboard.dismiss()}
        />
        {originIsGps ? (
          <View style={styles.gpsStatus}>
            <Ionicons name="checkmark-circle" size={13} color={colors.routeSafe} />
            <Text style={[styles.gpsStatusText, { color: colors.routeSafe }]}>Using your device location</Text>
          </View>
        ) : null}
        {originError ? (
          <Text style={[styles.inlineError, { color: colors.destructive }]}>{originError}</Text>
        ) : null}
        <View style={[styles.fieldDivider, { backgroundColor: colors.border }]} />
        <PlannerField
          title="TO"
          value={destination}
          onChangeText={(value) => {
            setDestination(value);
            setFormError('');
          }}
          placeholder="Where do you want to go?"
          accessibilityLabel="Destination"
          icon="location"
          onSubmitEditing={handleFindRoutes}
        />
        <View style={styles.mapPickRow}>
          <Text style={[styles.mapPickHint, { color: colors.mutedForeground }]}>
            Choose from suggestions or on the map
          </Text>
          <Pressable
            accessibilityRole="button"
            testID="pick-destination-on-map"
            onPress={() => setShowMapPicker(true)}
            style={({ pressed }) => [styles.mapPickButton, { opacity: pressed ? 0.68 : 1 }]}
          >
            <Ionicons name="map-outline" size={15} color={colors.routeSafe} />
            <Text style={[styles.mapPickText, { color: colors.routeSafe }]}>Pick on map</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.suggestionRow}>
        {demoDestinations.map((place) => {
          const active = destination === place;
          return (
            <Pressable
              key={place}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => {
                setDestination(place);
                setFormError('');
                triggerHaptic();
              }}
              style={({ pressed }) => [
                styles.suggestionChip,
                {
                  backgroundColor: active ? colors.safeTint : colors.card,
                  borderColor: active ? colors.routeSafe : colors.border,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <Text style={[styles.suggestionText, { color: active ? colors.routeSafe : colors.foreground }]}>
                {place}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.selectorSection}>
        <View style={styles.sectionTitleRow}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Travel mode</Text>
          <Text style={[styles.sectionHint, { color: colors.mutedForeground }]}>Choose one</Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.modeRow}
          keyboardShouldPersistTaps="handled"
        >
          {travelModes.map((item) => (
            <ModeButton
              key={item.id}
              mode={item}
              active={mode === item.id}
              onPress={() => {
                setMode(item.id);
                triggerHaptic();
              }}
            />
          ))}
        </ScrollView>
      </View>

      <View style={styles.selectorSection}>
        <View style={styles.sectionTitleRow}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Your priority</Text>
          <Pressable
            accessibilityRole="button"
            testID="explain-safety-score"
            onPress={() => setShowScoring(true)}
            style={({ pressed }) => [styles.learnMore, { opacity: pressed ? 0.65 : 1 }]}
          >
            <Ionicons name="help-circle-outline" size={15} color={colors.routeSafe} />
            <Text style={[styles.learnMoreText, { color: colors.routeSafe }]}>How scores work</Text>
          </Pressable>
        </View>
        <View style={styles.preferenceRow}>
          {safetyPreferences.map((item) => (
            <PreferenceButton
              key={item.id}
              preference={item}
              active={preference === item.id}
              onPress={() => {
                setPreference(item.id);
                triggerHaptic();
              }}
            />
          ))}
        </View>
      </View>

      {formError ? (
        <View style={[styles.formErrorBanner, { backgroundColor: colors.destructiveTint }]}>
          <Ionicons name="alert-circle-outline" size={16} color={colors.destructive} />
          <Text style={[styles.formErrorText, { color: colors.destructive }]}>{formError}</Text>
        </View>
      ) : null}
      <Pressable
        accessibilityRole="button"
        testID="find-safe-route"
        onPress={handleFindRoutes}
        style={({ pressed }) => [
          styles.primaryButton,
          {
            backgroundColor: colors.deepGreen,
            opacity: pressed ? 0.88 : 1,
            shadowColor: colors.deepGreen,
          },
        ]}
      >
        <Ionicons name="shield-checkmark" size={19} color={colors.lime} />
        <Text style={[styles.primaryButtonText, { color: colors.primaryForeground }]}>
          FIND SAFE ROUTE
        </Text>
        <Ionicons name="arrow-forward" size={19} color={colors.primaryForeground} />
      </Pressable>
      <View style={[styles.disclaimerCard, { backgroundColor: colors.secondary }]}>
        <Ionicons name="information-circle-outline" size={16} color={colors.mutedForeground} />
        <Text style={[styles.disclaimerCardText, { color: colors.mutedForeground }]}>
          Demo routes use illustrative conditions, not live incident data or turn-by-turn directions.
        </Text>
      </View>
    </KeyboardAwareScrollViewCompat>
  );

  const renderRouteResults = () => (
    <KeyboardAwareScrollViewCompat
      style={styles.fill}
      contentContainerStyle={safeScrollStyle}
      keyboardShouldPersistTaps="handled"
      bottomOffset={82}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.resultsTopbar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to trip planner"
          onPress={() => setStage('planner')}
          style={({ pressed }) => [
            styles.backButton,
            { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.72 : 1 },
          ]}
        >
          <Ionicons name="arrow-back" size={19} color={colors.foreground} />
        </Pressable>
        <View style={styles.resultsBrand}>
          <Text style={[styles.resultsBrandName, { color: colors.foreground }]}>SafeRoute</Text>
          <Text style={[styles.resultsBrandAI, { color: colors.routeSafe }]}>AI</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open SafeCircle"
          onPress={openSafeCircle}
          style={({ pressed }) => [
            styles.backButton,
            { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.72 : 1 },
          ]}
        >
          <Ionicons name="people-outline" size={19} color={colors.foreground} />
        </Pressable>
      </View>
      <View style={styles.resultsHeading}>
        <Text style={[styles.pageEyebrow, { color: colors.routeSafe }]}>ROUTE COMPARISON</Text>
        <Text style={[styles.pageTitle, { color: colors.foreground }]}>Three ways there.</Text>
        <Text style={[styles.pageSubtitle, { color: colors.mutedForeground }]}>
          {origin} <Ionicons name="arrow-forward" size={12} color={colors.mutedForeground} /> {destination}
        </Text>
      </View>
      <RouteMap selectedRoute={selectedRoute?.id ?? 'safe'} showAllRoutes height={202} />
      <View style={styles.mapLegend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendLine, { backgroundColor: colors.routeSafe }]} />
          <Text style={[styles.legendText, { color: colors.mutedForeground }]}>Well-lit</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendLine, { backgroundColor: colors.routeQuick }]} />
          <Text style={[styles.legendText, { color: colors.mutedForeground }]}>Quick</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendLine, { backgroundColor: colors.routeSteady }]} />
          <Text style={[styles.legendText, { color: colors.mutedForeground }]}>Balanced</Text>
        </View>
      </View>
      <View style={styles.routesTitleRow}>
        <View style={styles.routesTitleCopy}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Choose your route</Text>
          <Text style={[styles.sectionHint, { color: colors.mutedForeground }]}>
            Recommended for {preference}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => setShowScoring(true)}
          style={({ pressed }) => [styles.smallExplain, { opacity: pressed ? 0.7 : 1 }]}
        >
          <Ionicons name="information-circle-outline" size={16} color={colors.routeSafe} />
          <Text style={[styles.smallExplainText, { color: colors.routeSafe }]}>Score model</Text>
        </Pressable>
      </View>
      {routes.map((route) => (
        <RouteCard
          key={route.id}
          route={route}
          selected={selectedRoute?.id === route.id}
          recommended={recommendedRoute?.id === route.id}
          onPress={() => {
            setSelectedRouteId(route.id);
            triggerHaptic();
          }}
        />
      ))}
      <View style={[styles.disclaimerCard, { backgroundColor: colors.secondary }]}>
        <Ionicons name="alert-circle-outline" size={16} color={colors.routeQuick} />
        <Text style={[styles.disclaimerCardText, { color: colors.mutedForeground }]}>
          Prototype estimates only. The schematic map and route conditions are not live navigation or a guarantee of safety.
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        testID="start-demo-journey"
        disabled={!selectedRoute}
        onPress={() => {
          setJourneyStep(0);
          setStage('journey');
          triggerHaptic();
        }}
        style={({ pressed }) => [
          styles.primaryButton,
          {
            backgroundColor: colors.deepGreen,
            opacity: !selectedRoute || pressed ? 0.82 : 1,
            shadowColor: colors.deepGreen,
          },
        ]}
      >
        <Ionicons name="navigate" size={18} color={colors.lime} />
        <Text style={[styles.primaryButtonText, { color: colors.primaryForeground }]}>
          START DEMO JOURNEY
        </Text>
        <Ionicons name="arrow-forward" size={19} color={colors.primaryForeground} />
      </Pressable>
    </KeyboardAwareScrollViewCompat>
  );

  const renderJourney = () => {
    if (!selectedRoute) return null;
    const steps = journeyInstructions[selectedRoute.id];
    const progress = Math.min(100, Math.round((journeyStep / steps.length) * 100));
    const remainingMinutes = Math.max(
      1,
      selectedRoute.eta - Math.floor((journeyStep * selectedRoute.eta) / steps.length),
    );

    return (
      <KeyboardAwareScrollViewCompat
        style={styles.fill}
        contentContainerStyle={safeScrollStyle}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.resultsTopbar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to routes"
            onPress={() => setStage('routes')}
            style={({ pressed }) => [
              styles.backButton,
              { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.72 : 1 },
            ]}
          >
            <Ionicons name="arrow-back" size={19} color={colors.foreground} />
          </Pressable>
          <View style={styles.resultsBrand}>
            <Text style={[styles.resultsBrandName, { color: colors.foreground }]}>SafeRoute</Text>
            <Text style={[styles.resultsBrandAI, { color: colors.routeSafe }]}>AI</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open SafeCircle"
            onPress={openSafeCircle}
            style={({ pressed }) => [
              styles.backButton,
              { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.72 : 1 },
            ]}
          >
            <Ionicons name="people-outline" size={19} color={colors.foreground} />
          </Pressable>
        </View>
        <View style={styles.journeyHeader}>
          <View style={[styles.journeyStatus, { backgroundColor: colors.safeTint }]}>
            <View style={[styles.liveDot, { backgroundColor: colors.routeSafe }]} />
            <Text style={[styles.liveText, { color: colors.routeSafe }]}>DEMO JOURNEY</Text>
          </View>
          <Text style={[styles.pageTitle, { color: colors.foreground }]}>Stay on the safer way.</Text>
          <Text style={[styles.pageSubtitle, { color: colors.mutedForeground }]}>
            To {destination} · {selectedRoute.name}
          </Text>
        </View>
        <RouteMap selectedRoute={selectedRoute.id} height={260} />
        <View style={[styles.tripSummary, { backgroundColor: colors.deepGreen }]}>
          <View style={styles.tripScoreBlock}>
            <View style={[styles.tripScoreIcon, { backgroundColor: colors.safeTint }]}>
              <Ionicons name="shield-checkmark" size={17} color={colors.lime} />
            </View>
            <View>
              <Text style={[styles.tripScoreLabel, { color: colors.onDarkMuted }]}>DEMO SAFETY SCORE</Text>
              <Text style={[styles.tripScoreValue, { color: colors.primaryForeground }]}>
                {selectedRoute.safetyScore}
                <Text style={[styles.tripScoreOutOf, { color: colors.onDarkMuted }]}> /100</Text>
              </Text>
            </View>
          </View>
          <View style={styles.tripRemaining}>
            <Text style={[styles.tripRemainingValue, { color: colors.primaryForeground }]}>
              {remainingMinutes}
            </Text>
            <Text style={[styles.tripRemainingLabel, { color: colors.onDarkMuted }]}>MIN LEFT</Text>
          </View>
        </View>
        <View style={styles.progressWrap}>
          <View style={[styles.progressTrack, { backgroundColor: colors.muted }]}>
            <View style={[styles.progressFill, { backgroundColor: colors.routeSafe, width: `${progress}%` }]} />
          </View>
          <Text style={[styles.progressLabel, { color: colors.mutedForeground }]}>
            {journeyStep === 0 ? 'Ready to begin' : `${journeyStep} of ${steps.length} steps`}
          </Text>
        </View>
        <View style={[styles.instructionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.instructionIndex, { backgroundColor: colors.safeTint }]}>
            <Ionicons name="arrow-up" size={20} color={colors.routeSafe} />
          </View>
          <View style={styles.instructionCopy}>
            <Text style={[styles.instructionEyebrow, { color: colors.routeSafe }]}>
              {journeyStep === 0 ? 'FIRST STEP' : `STEP ${journeyStep + 1}`}
            </Text>
            <Text style={[styles.instructionText, { color: colors.foreground }]}>
              {steps[Math.min(journeyStep, steps.length - 1)]}
            </Text>
          </View>
        </View>
        <View style={styles.journeyActionRow}>
          <Pressable
            accessibilityRole="button"
            testID="journey-sos"
            onPress={() => setShowSos(true)}
            style={({ pressed }) => [
              styles.sosButton,
              { backgroundColor: colors.destructiveTint, borderColor: colors.destructive, opacity: pressed ? 0.78 : 1 },
            ]}
          >
            <Ionicons name="alert-circle" size={18} color={colors.destructive} />
            <Text style={[styles.sosButtonText, { color: colors.destructive }]}>SOS</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            testID="journey-safe-circle"
            onPress={openSafeCircle}
            style={({ pressed }) => [
              styles.circleButton,
              { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.82 : 1 },
            ]}
          >
            <Ionicons name="people-outline" size={17} color={colors.foreground} />
            <Text style={[styles.circleButtonText, { color: colors.foreground }]}>SafeCircle</Text>
          </Pressable>
          {journeyStep < steps.length - 1 ? (
            <Pressable
              accessibilityRole="button"
              testID="next-journey-step"
              onPress={() => {
                setJourneyStep((step) => Math.min(step + 1, steps.length - 1));
                triggerHaptic();
              }}
              style={({ pressed }) => [
                styles.nextStepButton,
                { backgroundColor: colors.deepGreen, opacity: pressed ? 0.82 : 1 },
              ]}
            >
              <Ionicons name="arrow-forward" size={18} color={colors.primaryForeground} />
            </Pressable>
          ) : (
            <Pressable
              accessibilityRole="button"
              testID="finish-demo-journey"
              onPress={() => {
                setStage('routes');
                setJourneyStep(0);
              }}
              style={({ pressed }) => [
                styles.finishButton,
                { backgroundColor: colors.deepGreen, opacity: pressed ? 0.82 : 1 },
              ]}
            >
              <Text style={[styles.finishButtonText, { color: colors.primaryForeground }]}>Finish</Text>
              <Ionicons name="checkmark" size={17} color={colors.lime} />
            </Pressable>
          )}
        </View>
        <View style={[styles.disclaimerCard, { backgroundColor: colors.secondary }]}>
          <Ionicons name="information-circle-outline" size={16} color={colors.mutedForeground} />
          <Text style={[styles.disclaimerCardText, { color: colors.mutedForeground }]}>
            Turn guidance is simulated for this demo. No background tracking or automatic check-ins are active.
          </Text>
        </View>
      </KeyboardAwareScrollViewCompat>
    );
  };

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[styles.screen, { backgroundColor: colors.background }]}
    >
      <StatusBar style={colors.statusBarStyle} />
      {stage === 'planner'
        ? renderPlanner()
        : stage === 'routes'
          ? renderRouteResults()
          : renderJourney()}
      <MapPickerSheet
        visible={showMapPicker}
        onClose={() => setShowMapPicker(false)}
        onSelect={(place) => {
          setDestination(place);
          setFormError('');
          setShowMapPicker(false);
          triggerHaptic();
        }}
      />
      <SafeCircleSheet
        visible={showSafeCircle}
        contacts={contacts}
        storageError={contactStorageError}
        onClose={() => setShowSafeCircle(false)}
        onAdd={addContact}
        onRemove={removeContact}
        onShare={shareTrip}
      />
      <ScoringSheet visible={showScoring} onClose={() => setShowScoring(false)} />
      <SosSheet
        visible={showSos}
        onClose={() => setShowSos(false)}
        onCall={handleCallEmergency}
        onShare={shareTrip}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  fill: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    gap: 17,
  },
  brandHeader: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  brandMark: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandNameWrap: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  brandName: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    letterSpacing: -0.5,
  },
  brandAI: {
    marginLeft: 3,
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  demoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: 12,
  },
  demoDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  demoLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 8,
    letterSpacing: 0.6,
  },
  headerCircleButton: {
    width: 37,
    height: 37,
    borderWidth: 1,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 12,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  liveText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 8,
    letterSpacing: 0.6,
  },
  hero: {
    paddingTop: 2,
    gap: 10,
  },
  heroEyebrow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 10,
  },
  heroEyebrowText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 8,
    letterSpacing: 0.85,
  },
  heroTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 34,
    lineHeight: 39,
    letterSpacing: -1.5,
  },
  heroSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 19,
    marginTop: -3,
  },
  plannerCard: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingTop: 13,
    paddingBottom: 10,
  },
  plannerTopline: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionEyebrow: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    letterSpacing: 0.8,
  },
  editableTag: {
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 7,
  },
  editableTagText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 7,
    letterSpacing: 0.35,
  },
  fieldRow: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  fieldIconColumn: {
    width: 26,
    alignSelf: 'stretch',
    alignItems: 'center',
    paddingTop: 14,
  },
  fieldIcon: {
    width: 25,
    height: 25,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  fieldConnector: {
    position: 'absolute',
    width: 1,
    top: 38,
    bottom: -6,
  },
  fieldInputWrap: {
    flex: 1,
    paddingVertical: 7,
    gap: 2,
  },
  fieldTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 8,
    letterSpacing: 0.75,
  },
  fieldInput: {
    padding: 0,
    minHeight: 25,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },
  gpsButton: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 1,
  },
  gpsStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: -2,
    marginLeft: 37,
    marginBottom: 5,
  },
  gpsStatusText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
  },
  inlineError: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    marginLeft: 37,
    marginBottom: 4,
  },
  fieldDivider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 37,
  },
  mapPickRow: {
    marginLeft: 37,
    marginTop: 5,
    marginBottom: 3,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  mapPickHint: {
    fontFamily: 'Inter_400Regular',
    fontSize: 9,
    flex: 1,
  },
  mapPickButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 5,
    paddingLeft: 4,
  },
  mapPickText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
  },
  suggestionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginTop: -8,
  },
  suggestionChip: {
    borderWidth: 1,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  suggestionText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
  },
  selectorSection: {
    gap: 9,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
  },
  sectionHint: {
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
  },
  modeRow: {
    gap: 7,
    paddingRight: 20,
  },
  modeButton: {
    minWidth: 83,
    minHeight: 55,
    paddingHorizontal: 9,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  modeLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 9,
  },
  preferenceRow: {
    flexDirection: 'row',
    gap: 7,
  },
  preferenceButton: {
    minHeight: 48,
    flex: 1,
    paddingHorizontal: 6,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 5,
  },
  preferenceLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
  },
  learnMore: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  learnMoreText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
  },
  formErrorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    padding: 10,
    borderRadius: 12,
    marginBottom: -7,
  },
  formErrorText: {
    flex: 1,
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
  },
  primaryButton: {
    height: 55,
    paddingHorizontal: 16,
    borderRadius: 17,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 11,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 3,
  },
  primaryButtonText: {
    flex: 1,
    textAlign: 'center',
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
    letterSpacing: 0.9,
  },
  disclaimerCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  disclaimerCardText: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
    lineHeight: 15,
  },
  resultsTopbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 39,
    height: 39,
    borderWidth: 1,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultsBrand: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  resultsBrandName: {
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
    letterSpacing: -0.4,
  },
  resultsBrandAI: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    marginLeft: 2,
  },
  resultsHeading: {
    gap: 5,
    marginTop: 3,
    marginBottom: -2,
  },
  pageEyebrow: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    letterSpacing: 1,
  },
  pageTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 27,
    letterSpacing: -0.9,
    lineHeight: 33,
  },
  pageSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    lineHeight: 17,
  },
  mapLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 17,
    marginTop: -8,
    marginBottom: -1,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendLine: {
    width: 14,
    height: 3,
    borderRadius: 2,
  },
  legendText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 9,
  },
  routesTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
    marginBottom: -6,
  },
  routesTitleCopy: {
    gap: 3,
  },
  smallExplain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
  },
  smallExplainText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 9,
  },
  journeyHeader: {
    gap: 7,
    marginTop: 3,
    marginBottom: -2,
  },
  journeyStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 10,
  },
  tripSummary: {
    borderRadius: 18,
    paddingHorizontal: 15,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: -2,
  },
  tripScoreBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  tripScoreIcon: {
    width: 37,
    height: 37,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tripScoreLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 8,
    letterSpacing: 0.7,
    marginBottom: 3,
  },
  tripScoreValue: {
    fontFamily: 'Inter_700Bold',
    fontSize: 22,
  },
  tripScoreOutOf: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
  },
  tripRemaining: {
    alignItems: 'flex-end',
  },
  tripRemainingValue: {
    fontFamily: 'Inter_700Bold',
    fontSize: 20,
  },
  tripRemainingLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 8,
    letterSpacing: 0.7,
    marginTop: 1,
  },
  progressWrap: {
    gap: 6,
    marginTop: -7,
  },
  progressTrack: {
    height: 5,
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 5,
  },
  progressLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 9,
  },
  instructionCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    borderWidth: 1,
    borderRadius: 17,
  },
  instructionIndex: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  instructionCopy: {
    flex: 1,
    gap: 5,
  },
  instructionEyebrow: {
    fontFamily: 'Inter_700Bold',
    fontSize: 8,
    letterSpacing: 0.8,
  },
  instructionText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    lineHeight: 18,
  },
  journeyActionRow: {
    flexDirection: 'row',
    gap: 7,
    alignItems: 'center',
  },
  sosButton: {
    borderWidth: 1,
    minHeight: 46,
    minWidth: 76,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 5,
  },
  sosButtonText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    letterSpacing: 0.5,
  },
  circleButton: {
    borderWidth: 1,
    minHeight: 46,
    flex: 1,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 7,
  },
  circleButtonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
  },
  nextStepButton: {
    width: 47,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  finishButton: {
    minHeight: 46,
    flex: 1,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  finishButtonText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(10, 24, 18, 0.45)',
  },
  explainSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 10,
    paddingHorizontal: 20,
    paddingBottom: 15,
  },
  sheetHandle: {
    width: 38,
    height: 4,
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 17,
  },
  explainHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  explainIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  explainHeaderCopy: {
    flex: 1,
    gap: 4,
  },
  sheetTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 19,
  },
  sheetSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
    lineHeight: 15,
  },
  sheetClose: {
    padding: 4,
  },
  explainBody: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 15,
  },
  weightList: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 13,
  },
  weightRow: {
    minHeight: 43,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  weightDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  weightLabel: {
    flex: 1,
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
  },
  weightValue: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
  },
  modelFormula: {
    borderRadius: 14,
    padding: 12,
    marginTop: 12,
    gap: 4,
  },
  formulaTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
  },
  formulaText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
  },
  disclaimerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 13,
  },
  disclaimerText: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
    lineHeight: 15,
  },
  sosHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 15,
  },
  sosIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sosDisclosure: {
    padding: 12,
    borderRadius: 13,
    marginBottom: 13,
  },
  sosDisclosureText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    lineHeight: 16,
  },
  callButton: {
    minHeight: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  callButtonText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
  },
  secondaryAction: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 14,
    marginTop: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  secondaryActionText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
  },
  sosFooter: {
    fontFamily: 'Inter_400Regular',
    fontSize: 9,
    lineHeight: 15,
    textAlign: 'center',
    marginTop: 12,
  },
});
