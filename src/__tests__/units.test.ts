import {
  tempFromC, formatTemp, formatTempWithUnit,
  windFromKph, formatWind,
  distanceFromKm, kmFromDistance, formatDistance, formatRunDistance,
} from '../utils/units';

describe('temperature', () => {
  it('passes celsius through', () => {
    expect(tempFromC(20, 'C')).toBe(20);
    expect(formatTemp(20.4, 'C')).toBe('20°');
  });

  it('converts to fahrenheit', () => {
    expect(tempFromC(0, 'F')).toBe(32);
    expect(tempFromC(20, 'F')).toBe(68);
    expect(formatTempWithUnit(20, 'F')).toBe('68°F');
  });
});

describe('wind', () => {
  it('passes km/h through', () => {
    expect(formatWind(15, 'km/h')).toBe('15 km/h');
  });

  it('converts to mph', () => {
    expect(Math.round(windFromKph(16.09344, 'mph') * 100) / 100).toBe(10);
    expect(formatWind(16, 'mph')).toBe('10 mph');
  });

  it('converts to m/s with one decimal', () => {
    expect(formatWind(18, 'm/s')).toBe('5 m/s');
    expect(formatWind(15, 'm/s')).toBe('4.2 m/s');
  });
});

describe('distance', () => {
  it('passes km through', () => {
    expect(distanceFromKm(5, 'km')).toBe(5);
    expect(formatDistance(5, 'km')).toBe('5.0 km');
  });

  it('converts km to miles and back', () => {
    expect(distanceFromKm(1.609344, 'mi')).toBeCloseTo(1);
    expect(kmFromDistance(1, 'mi')).toBeCloseTo(1.609344);
    expect(formatDistance(10, 'mi')).toBe('6.2 mi');
  });

  it('formats compact run labels', () => {
    expect(formatRunDistance(5, 'km')).toBe('5K');
    expect(formatRunDistance(7.5, 'km')).toBe('7.5K');
    expect(formatRunDistance(5, 'mi')).toBe('3.1 mi');
  });
});
