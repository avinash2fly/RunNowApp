import React from 'react';
import Svg, { Path, Circle, Rect, G } from 'react-native-svg';

export type IconName =
  | 'run' | 'sun' | 'cloud' | 'cloudSun' | 'rain' | 'wind' | 'bolt' | 'bell'
  | 'plus' | 'calendar' | 'chevron' | 'chevronL' | 'settings' | 'location'
  | 'history' | 'home' | 'check' | 'drop' | 'flame' | 'moon' | 'avatar'
  | 'play' | 'chart' | 'target' | 'trash' | 'edit'
  | 'lock' | 'music' | 'pause' | 'stop' | 'close';

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  stroke?: number;
}

export function Icon({ name, size = 24, color = '#000', stroke = 1.8 }: IconProps) {
  const s = { width: size, height: size };
  switch (name) {
    case 'run':
      return (
        <Svg {...s} viewBox="0 0 24 24">
          <Path d="M13.49 5.48c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM9.89 19.38l1-4.4 2.1 2v6h2v-7.5l-2.1-2 .6-3c1.3 1.5 3.3 2.5 5.5 2.5v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1l-5.2 2.2v4.7h2v-3.4l1.8-.7-1.6 8.1-4.9-1-.4 2 7 1.4z" fill={color}/>
        </Svg>
      );
    case 'sun':
      return (
        <Svg {...s} viewBox="0 0 24 24" fill="none">
          <Circle cx="12" cy="12" r="4" stroke={color} strokeWidth={stroke} strokeLinecap="round"/>
          <Path d="M12 3v1.5M12 19.5V21M3 12h1.5M19.5 12H21M5.6 5.6l1 1M17.4 17.4l1 1M5.6 18.4l1-1M17.4 6.6l1-1" stroke={color} strokeWidth={stroke} strokeLinecap="round"/>
        </Svg>
      );
    case 'cloud':
      return (
        <Svg {...s} viewBox="0 0 24 24" fill="none">
          <Path d="M7 18a4 4 0 0 1-.5-8 6 6 0 0 1 11.6 1.4A3.5 3.5 0 0 1 17.5 18H7Z" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round"/>
        </Svg>
      );
    case 'cloudSun':
      return (
        <Svg {...s} viewBox="0 0 24 24" fill="none">
          <Circle cx="8" cy="9" r="2.5" stroke={color} strokeWidth={stroke}/>
          <Path d="M8 4v1M8 13v1M3 9h1M12 9h1M4.5 5.5l.7.7M11.5 12.5l.7.7M4.5 12.5l.7-.7" stroke={color} strokeWidth={stroke} strokeLinecap="round"/>
          <Path d="M9 19a3 3 0 0 1-.4-6 5 5 0 0 1 9.5 1.2A3 3 0 0 1 18 19H9Z" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round"/>
        </Svg>
      );
    case 'rain':
      return (
        <Svg {...s} viewBox="0 0 24 24" fill="none">
          <Path d="M7 14a4 4 0 0 1-.5-8 6 6 0 0 1 11.6 1.4A3.5 3.5 0 0 1 17.5 14H7Z" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round"/>
          <Path d="M9 17l-1 3M13 17l-1 3M17 17l-1 3" stroke={color} strokeWidth={stroke} strokeLinecap="round"/>
        </Svg>
      );
    case 'wind':
      return (
        <Svg {...s} viewBox="0 0 24 24" fill="none">
          <Path d="M4 9h11a2.5 2.5 0 1 0-2.5-2.5M4 15h14a2.5 2.5 0 1 1-2.5 2.5M4 12h8" stroke={color} strokeWidth={stroke} strokeLinecap="round"/>
        </Svg>
      );
    case 'bolt':
      return (
        <Svg {...s} viewBox="0 0 24 24">
          <Path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" fill={color}/>
        </Svg>
      );
    case 'bell':
      return (
        <Svg {...s} viewBox="0 0 24 24" fill="none">
          <Path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2H4.5L6 16Z" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round"/>
          <Path d="M10 21a2 2 0 0 0 4 0" stroke={color} strokeWidth={stroke} strokeLinecap="round"/>
        </Svg>
      );
    case 'plus':
      return (
        <Svg {...s} viewBox="0 0 24 24" fill="none">
          <Path d="M12 5v14M5 12h14" stroke={color} strokeWidth={2.4} strokeLinecap="round"/>
        </Svg>
      );
    case 'calendar':
      return (
        <Svg {...s} viewBox="0 0 24 24" fill="none">
          <Rect x="3.5" y="5" width="17" height="15" rx="2.5" stroke={color} strokeWidth={stroke}/>
          <Path d="M3.5 10h17M8 3v4M16 3v4" stroke={color} strokeWidth={stroke} strokeLinecap="round"/>
        </Svg>
      );
    case 'chevron':
      return (
        <Svg {...s} viewBox="0 0 24 24" fill="none">
          <Path d="M9 6l6 6-6 6" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round"/>
        </Svg>
      );
    case 'chevronL':
      return (
        <Svg {...s} viewBox="0 0 24 24" fill="none">
          <Path d="M15 6l-6 6 6 6" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round"/>
        </Svg>
      );
    case 'settings':
      return (
        <Svg {...s} viewBox="0 0 24 24" fill="none">
          <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth={stroke}/>
          <Path d="M19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.4.9a7 7 0 0 0-2-1.2L14 3h-4l-.5 2.6a7 7 0 0 0-2 1.2l-2.4-.9-2 3.4 2 1.5A7 7 0 0 0 5 12c0 .4 0 .8.1 1.2l-2 1.5 2 3.4 2.4-.9a7 7 0 0 0 2 1.2L10 21h4l.5-2.6a7 7 0 0 0 2-1.2l2.4.9 2-3.4-2-1.5c.1-.4.1-.8.1-1.2Z" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round"/>
        </Svg>
      );
    case 'location':
      return (
        <Svg {...s} viewBox="0 0 24 24" fill="none">
          <Path d="M12 21s7-7 7-12a7 7 0 0 0-14 0c0 5 7 12 7 12Z" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round"/>
          <Circle cx="12" cy="9" r="2.5" stroke={color} strokeWidth={stroke}/>
        </Svg>
      );
    case 'history':
      return (
        <Svg {...s} viewBox="0 0 24 24" fill="none">
          <Path d="M3 12a9 9 0 1 0 3-6.7L3 8" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round"/>
          <Path d="M3 4v4h4" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round"/>
          <Path d="M12 8v4l3 2" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round"/>
        </Svg>
      );
    case 'home':
      return (
        <Svg {...s} viewBox="0 0 24 24" fill="none">
          <Path d="M4 11l8-7 8 7v9a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1v-9Z" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round"/>
        </Svg>
      );
    case 'check':
      return (
        <Svg {...s} viewBox="0 0 24 24" fill="none">
          <Path d="M5 12l5 5L20 7" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"/>
        </Svg>
      );
    case 'drop':
      return (
        <Svg {...s} viewBox="0 0 24 24" fill="none">
          <Path d="M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11Z" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round"/>
        </Svg>
      );
    case 'flame':
      return (
        <Svg {...s} viewBox="0 0 24 24" fill="none">
          <Path d="M12 22a6 6 0 0 0 6-6c0-2-1-3-2-4 0 2-1 3-2 3 1-3-1-6-4-9 0 4-4 5-4 10a6 6 0 0 0 6 6Z" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round"/>
        </Svg>
      );
    case 'moon':
      return (
        <Svg {...s} viewBox="0 0 24 24">
          <Path d="M20 14.5A8 8 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z" fill={color}/>
        </Svg>
      );
    case 'avatar':
      return (
        <Svg {...s} viewBox="0 0 24 24">
          <Circle cx="12" cy="12" r="10" fill={color} opacity={0.18}/>
          <Circle cx="12" cy="9.5" r="3.2" fill={color}/>
          <Path d="M5 19a7 7 0 0 1 14 0" fill={color}/>
        </Svg>
      );
    case 'play':
      return (
        <Svg {...s} viewBox="0 0 24 24">
          <Path d="M7 4v16l13-8L7 4Z" fill={color}/>
        </Svg>
      );
    case 'chart':
      return (
        <Svg {...s} viewBox="0 0 24 24" fill="none">
          <Path d="M4 20V4M4 20h16" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round"/>
          <Path d="M8 16v-4M12 16v-7M16 16v-2" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round"/>
        </Svg>
      );
    case 'target':
      return (
        <Svg {...s} viewBox="0 0 24 24" fill="none">
          <Circle cx="12" cy="12" r="8" stroke={color} strokeWidth={stroke}/>
          <Circle cx="12" cy="12" r="4" stroke={color} strokeWidth={stroke}/>
          <Circle cx="12" cy="12" r="1.2" fill={color}/>
        </Svg>
      );
    case 'trash':
      return (
        <Svg {...s} viewBox="0 0 24 24" fill="none">
          <Path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round"/>
        </Svg>
      );
    case 'edit':
      return (
        <Svg {...s} viewBox="0 0 24 24" fill="none">
          <Path d="M4 20h4l11-11-4-4L4 16v4Z" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round"/>
          <Path d="M14 6l4 4" stroke={color} strokeWidth={stroke} strokeLinecap="round"/>
        </Svg>
      );
    case 'lock':
      return (
        <Svg {...s} viewBox="0 0 24 24" fill="none">
          <Rect x="5" y="11" width="14" height="9" rx="2" stroke={color} strokeWidth={stroke}/>
          <Path d="M8 11V8a4 4 0 0 1 8 0v3" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round"/>
        </Svg>
      );
    case 'music':
      return (
        <Svg {...s} viewBox="0 0 24 24" fill="none">
          <Path d="M9 18V6l11-2v12" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round"/>
          <Circle cx="6" cy="18" r="3" fill={color}/>
          <Circle cx="17" cy="16" r="3" fill={color}/>
        </Svg>
      );
    case 'pause':
      return (
        <Svg {...s} viewBox="0 0 24 24">
          <Rect x="6" y="4" width="4" height="16" rx="1" fill={color}/>
          <Rect x="14" y="4" width="4" height="16" rx="1" fill={color}/>
        </Svg>
      );
    case 'stop':
      return (
        <Svg {...s} viewBox="0 0 24 24">
          <Rect x="5" y="5" width="14" height="14" rx="2" fill={color}/>
        </Svg>
      );
    case 'close':
      return (
        <Svg {...s} viewBox="0 0 24 24" fill="none">
          <Path d="M6 6l12 12M18 6L6 18" stroke={color} strokeWidth={2.4} strokeLinecap="round"/>
        </Svg>
      );
  }
  return null;
}
