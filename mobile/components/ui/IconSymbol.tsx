import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolWeight, SymbolScale } from 'expo-symbols';
import React from 'react';
import { OpaqueColorValue, StyleProp, TextStyle } from 'react-native';

// Add your SFSymbol to TypeScript's type definitions.
type SFSymbol =
  | 'house.fill'
  | 'heart.fill'
  | 'pills.fill'
  | 'waveform.path.ecg'
  | 'bubble.left.and.bubble.right.fill'
  | 'person.fill'
  | 'gear'
  | 'plus'
  | 'camera.fill'
  | 'message.fill'
  | 'chart.bar.fill';

export type IconSymbolName = SFSymbol | React.ComponentProps<typeof MaterialIcons>['name'];

/**
 * An icon component that uses native SFSymbols on iOS, and MaterialIcons on Android and web. This ensures a consistent look across platforms.
 *
 * See more icon options here: https://materialdesignicons.com/
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
  weight = 'regular',
  scale = 'default',
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
  scale?: SymbolScale;
}) {
  // Map SFSymbols to MaterialIcons equivalents
  const iconMap: Record<string, React.ComponentProps<typeof MaterialIcons>['name']> = {
    'house.fill': 'home',
    'heart.fill': 'favorite',
    'pills.fill': 'medication',
    'waveform.path.ecg': 'monitor-heart',
    'bubble.left.and.bubble.right.fill': 'chat',
    'person.fill': 'person',
    'gear': 'settings',
    'plus': 'add',
    'camera.fill': 'camera-alt',
    'message.fill': 'message',
    'chart.bar.fill': 'bar-chart',
  };

  const materialIconName = iconMap[name as string] || (name as React.ComponentProps<typeof MaterialIcons>['name']);

  return (
    <MaterialIcons
      color={color}
      size={size}
      name={materialIconName}
      style={style}
    />
  );
}



