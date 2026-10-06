export type TravelMode = 'walk' | 'cycle' | 'scooter' | 'car';
export type SafetyPreference = 'fastest' | 'safest' | 'balanced';
export type RouteId = 'safe' | 'quick' | 'steady';

export type RouteFactor = {
  label: string;
  score: number;
  weight: number;
};

export type SafeRoute = {
  id: RouteId;
  name: string;
  description: string;
  distance: string;
  eta: number;
  factors: RouteFactor[];
  safetyScore: number;
};

const weights = [0.3, 0.3, 0.25, 0.15];

const routeTemplates: Array<{
  id: RouteId;
  name: string;
  description: string;
  factors: [number, number, number, number];
}> = [
  {
    id: 'safe',
    name: 'Main street route',
    description: 'Well-lit streets with more open businesses',
    factors: [94, 90, 90, 90],
  },
  {
    id: 'quick',
    name: 'Direct shortcut',
    description: 'Shortest way, with fewer public-facing streets',
    factors: [68, 66, 68, 70],
  },
  {
    id: 'steady',
    name: 'Market & boulevard',
    description: 'Steady coverage with familiar, active streets',
    factors: [83, 81, 82, 80],
  },
];

const modeDetails: Record<
  TravelMode,
  { labels: [string, string, string]; distances: [number, number, number]; times: [number, number, number]; roadAdjustments: [number, number, number] }
> = {
  walk: {
    labels: ['Walking', 'Walking', 'Walking'],
    distances: [4.1, 3.5, 3.9],
    times: [14, 11, 12],
    roadAdjustments: [0, 0, 0],
  },
  cycle: {
    labels: ['Cycling', 'Cycling', 'Cycling'],
    distances: [4.8, 4.2, 4.5],
    times: [12, 10, 11],
    roadAdjustments: [0, -7, 5],
  },
  scooter: {
    labels: ['Two wheeler', 'Two wheeler', 'Two wheeler'],
    distances: [5.0, 4.5, 4.8],
    times: [11, 9, 10],
    roadAdjustments: [2, -5, 2],
  },
  car: {
    labels: ['Car', 'Car', 'Car'],
    distances: [5.4, 4.7, 5.0],
    times: [14, 11, 12],
    roadAdjustments: [3, -6, 2],
  },
};

export const safetyFactors = [
  { label: 'Street lighting', weight: '30%' },
  { label: 'People & open places', weight: '30%' },
  { label: 'Road suitability', weight: '25%' },
  { label: 'Route visibility', weight: '15%' },
] as const;

export function buildRoutes(mode: TravelMode): SafeRoute[] {
  const detail = modeDetails[mode];
  const factorLabels = [
    'Street lighting',
    'People & open places',
    mode === 'cycle' ? 'Cycling suitability' : 'Road suitability',
    'Route visibility',
  ];

  return routeTemplates.map((template, index) => {
    const adjustedRoadSafety = Math.max(
      0,
      Math.min(100, template.factors[2] + detail.roadAdjustments[index]),
    );
    const factorValues = [
      template.factors[0],
      template.factors[1],
      adjustedRoadSafety,
      template.factors[3],
    ];
    const factors = factorValues.map((score, factorIndex) => ({
      label: factorLabels[factorIndex],
      score,
      weight: weights[factorIndex],
    }));
    const safetyScore = Math.round(
      factors.reduce((total, factor) => total + factor.score * factor.weight, 0),
    );

    return {
      id: template.id,
      name: template.name,
      description: template.description,
      distance: `${detail.distances[index].toFixed(1)} km`,
      eta: detail.times[index],
      factors,
      safetyScore,
    };
  });
}

export function getRecommendedRoute(
  routes: SafeRoute[],
  preference: SafetyPreference,
): SafeRoute {
  if (preference === 'fastest') {
    return [...routes].sort((a, b) => a.eta - b.eta || b.safetyScore - a.safetyScore)[0];
  }

  if (preference === 'safest') {
    return [...routes].sort((a, b) => b.safetyScore - a.safetyScore || a.eta - b.eta)[0];
  }

  const minEta = Math.min(...routes.map((route) => route.eta));
  const maxEta = Math.max(...routes.map((route) => route.eta));
  const timeScore = (eta: number) =>
    maxEta === minEta ? 100 : Math.max(0, 100 - (eta - minEta) * 5);

  return [...routes].sort(
    (a, b) =>
      b.safetyScore * 0.5 + timeScore(b.eta) * 0.5 -
      (a.safetyScore * 0.5 + timeScore(a.eta) * 0.5),
  )[0];
}

export const travelModes: Array<{
  id: TravelMode;
  label: string;
  icon: 'walk' | 'bicycle' | 'speedometer' | 'car';
}> = [
  { id: 'walk', label: 'Walking', icon: 'walk' },
  { id: 'cycle', label: 'Cycling', icon: 'bicycle' },
  { id: 'scooter', label: 'Two wheeler', icon: 'speedometer' },
  { id: 'car', label: 'Car', icon: 'car' },
];

export const safetyPreferences: Array<{
  id: SafetyPreference;
  label: string;
  icon: 'flash' | 'shield-checkmark' | 'options';
}> = [
  { id: 'fastest', label: 'Fastest', icon: 'flash' },
  { id: 'safest', label: 'Safest', icon: 'shield-checkmark' },
  { id: 'balanced', label: 'Balanced', icon: 'options' },
];

export function getRouteColorKey(id: RouteId): 'routeSafe' | 'routeQuick' | 'routeSteady' {
  if (id === 'safe') return 'routeSafe';
  if (id === 'quick') return 'routeQuick';
  return 'routeSteady';
}
