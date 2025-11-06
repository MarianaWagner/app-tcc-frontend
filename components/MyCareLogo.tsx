import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { COLORS } from '../constants/colors';

interface MyCareLogoProps {
  size?: number;
  color?: string;
}

export default function MyCareLogo({ size = 80, color = COLORS.primary }: MyCareLogoProps) {
  return (
    <View style={styles.container}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        {/* Figura humana estilizada com coração no peito - linha contínua */}
        {/* Cabeça circular, ombros largos, coração no peito */}
        <Path
          d="M 50 15
             A 8 8 0 1 1 50 31
             A 8 8 0 1 1 50 15
             M 50 23
             C 35 23, 28 28, 28 38
             C 28 45, 32 48, 36 50
             C 38 49, 40 47, 42 45
             C 42 42, 43 40, 44 38
             C 44.5 37, 45 36, 45.5 36
             C 46 36, 46.5 36.5, 47 37
             C 47.5 36.5, 48 36, 48.5 36
             C 49 36, 49.5 36.5, 50 37
             C 50.5 36.5, 51 36, 51.5 36
             C 52 36, 52.5 36.5, 53 37
             C 53.5 36.5, 54 36, 54.5 36
             C 55 36, 55.5 37, 56 38
             C 56 40, 57 42, 57 45
             C 59 47, 61 49, 63 50
             C 67 48, 72 45, 72 38
             C 72 28, 65 23, 50 23
             Z"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

