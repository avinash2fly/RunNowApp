import { evaluateVerdict, weatherConditionToEmoji } from '../services/weather';
import { HourlyWeather } from '../types';

function hour(overrides: Partial<HourlyWeather> = {}): HourlyWeather {
  return {
    time_epoch: 1700000000,
    temp_c: 15,
    wind_kph: 5,
    chance_of_rain: 0,
    will_it_rain: 0,
    will_it_snow: 0,
    condition: { code: 1000, text: 'Clear', icon: '' },
    ...overrides,
  };
}

describe('evaluateVerdict', () => {
  it('returns UNKNOWN when given no hours', () => {
    expect(evaluateVerdict([])).toBe('UNKNOWN');
  });

  it('returns GOOD when all hours are clear', () => {
    expect(evaluateVerdict([hour(), hour(), hour(), hour()])).toBe('GOOD');
  });

  it('returns BAD when any hour will rain', () => {
    expect(evaluateVerdict([hour(), hour({ will_it_rain: 1 }), hour(), hour()])).toBe('BAD');
  });

  it('returns BAD when any hour will snow', () => {
    expect(evaluateVerdict([hour({ will_it_snow: 1 })])).toBe('BAD');
  });

  it('returns BAD when wind exceeds threshold', () => {
    expect(evaluateVerdict([hour({ wind_kph: 25 })])).toBe('BAD');
  });

  it('respects a custom wind threshold', () => {
    expect(evaluateVerdict([hour({ wind_kph: 25 })], 30)).toBe('GOOD');
    expect(evaluateVerdict([hour({ wind_kph: 25 })], 20)).toBe('BAD');
  });

  it('returns MARGINAL when only chance_of_rain is elevated', () => {
    expect(evaluateVerdict([hour({ chance_of_rain: 40 })])).toBe('MARGINAL');
  });

  it('prioritises BAD over MARGINAL', () => {
    const slots = [hour({ chance_of_rain: 60 }), hour({ will_it_rain: 1 })];
    expect(evaluateVerdict(slots)).toBe('BAD');
  });
});

describe('weatherConditionToEmoji', () => {
  it('maps clear (1000) to sun', () => {
    expect(weatherConditionToEmoji(1000)).toBe('☀️');
  });

  it('maps partly cloudy (1003) to sun-behind-cloud', () => {
    expect(weatherConditionToEmoji(1003)).toBe('⛅');
  });

  it('maps rainy codes to rain emoji', () => {
    expect(weatherConditionToEmoji(1063)).toBe('🌧️');
    expect(weatherConditionToEmoji(1240)).toBe('🌧️');
  });

  it('maps thunder codes to thunder emoji', () => {
    expect(weatherConditionToEmoji(1273)).toBe('⛈️');
  });

  it('falls back for unknown codes', () => {
    expect(weatherConditionToEmoji(99999)).toBe('🌤️');
  });
});
