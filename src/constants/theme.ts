export const Colors = {
  light: {
    text: '#17211B',
    background: '#F4F7F5',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#DDEDE3',
    textSecondary: '#627069',
    border: '#DDE4DF',
    brand: '#176B45',
    brandSoft: '#DDF3E7',
    danger: '#B42318',
    dangerSoft: '#FDE7E5',
    warning: '#9A6700',
    warningSoft: '#FFF2CC',
  },
  dark: {
    text: '#F2F6F3',
    background: '#0E1511',
    backgroundElement: '#18221C',
    backgroundSelected: '#234331',
    textSecondary: '#AAB8AF',
    border: '#2A3930',
    brand: '#70D6A0',
    brandSoft: '#1B3A29',
    danger: '#FF8A80',
    dangerSoft: '#442421',
    warning: '#F5C451',
    warningSoft: '#3F351C',
  },
} as const;

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = {
  small: 10,
  medium: 16,
  large: 24,
  pill: 999,
} as const;

export const MaxContentWidth = 800;
