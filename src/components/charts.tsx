import { useState } from 'react';
import { LayoutChangeEvent, Text, View } from 'react-native';
import Svg, { Circle, Line, Path, Rect, Text as SvgText } from 'react-native-svg';

import { colors } from '../theme';

function useWidth(initial = 300) {
  const [width, setWidth] = useState(initial);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);
  return { width, onLayout };
}

/** Circular progress showing calories remaining. */
export function Ring({ value, max, size = 150, stroke = 14, color = colors.primary, children }: {
  value: number;
  max: number;
  size?: number;
  stroke?: number;
  color?: string;
  children?: React.ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  const over = value > max;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.border} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={over ? colors.danger : color}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${c} ${c}`}
          strokeDashoffset={c * (1 - pct)}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      {children}
    </View>
  );
}

export interface Bar {
  label: string;
  value: number;
  /** Optional per-bar reference value drawn as a tick (e.g. daily goal). */
  target?: number;
}

/** Vertical bars with a dashed goal line; bars over target turn red. */
export function BarChart({ data, height = 180, goal }: { data: Bar[]; height?: number; goal?: number }) {
  const { width, onLayout } = useWidth();
  const padL = 36;
  const padT = 8;
  const padB = 20;
  const chartH = height - padB - padT;
  const chartW = width - padL;
  const max = Math.max(1, goal ?? 0, ...data.map((d) => Math.max(d.value, d.target ?? 0))) * 1.1;
  const slot = chartW / Math.max(1, data.length);
  const barW = Math.max(2, Math.min(28, slot * 0.65));
  const y = (v: number) => padT + chartH - (v / max) * chartH;
  const labelEvery = Math.ceil(data.length / 10);
  const ticks = [0, max / 2, max].map((t) => Math.round(t / 100) * 100);

  return (
    <View onLayout={onLayout} style={{ height }}>
      <Svg width={width} height={height}>
        {ticks.map((t) => (
          <SvgText key={t} x={padL - 6} y={y(t) + 4} fontSize={10} fill={colors.muted} textAnchor="end">
            {t}
          </SvgText>
        ))}
        {data.map((d, i) => {
          const x = padL + i * slot + (slot - barW) / 2;
          const limit = d.target ?? goal;
          const over = limit !== undefined && d.value > limit;
          return (
            <Rect
              key={i}
              x={x}
              y={y(d.value)}
              width={barW}
              height={Math.max(0, padT + chartH - y(d.value))}
              rx={Math.min(4, barW / 2)}
              fill={d.value === 0 ? colors.border : over ? colors.danger : colors.primary}
            />
          );
        })}
        {goal !== undefined && (
          <Line x1={padL} x2={width} y1={y(goal)} y2={y(goal)} stroke={colors.success} strokeWidth={1.5} strokeDasharray="5 4" />
        )}
        {data.map((d, i) =>
          i % labelEvery === 0 ? (
            <SvgText key={`l${i}`} x={padL + i * slot + slot / 2} y={height - 5} fontSize={10} fill={colors.muted} textAnchor="middle">
              {d.label}
            </SvgText>
          ) : null,
        )}
      </Svg>
    </View>
  );
}

export interface Point {
  /** x as a number, e.g. days since start. */
  x: number;
  y: number;
}

/** Line chart for weight with an optional horizontal goal line. */
export function LineChart({ points, height = 200, goal, xLabel }: {
  points: Point[];
  height?: number;
  goal?: number;
  xLabel?: (x: number) => string;
}) {
  const { width, onLayout } = useWidth();
  if (points.length === 0) {
    return (
      <View style={{ height: 80, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: colors.muted }}>Još nema podataka.</Text>
      </View>
    );
  }
  const padL = 40;
  const padR = 10;
  const padT = 10;
  const padB = 20;
  const ys = points.map((p) => p.y).concat(goal !== undefined ? [goal] : []);
  let minY = Math.min(...ys);
  let maxY = Math.max(...ys);
  if (maxY - minY < 2) {
    minY -= 1;
    maxY += 1;
  }
  const minX = points[0].x;
  const maxX = Math.max(minX + 1, points[points.length - 1].x);
  const sx = (x: number) => padL + ((x - minX) / (maxX - minX)) * (width - padL - padR);
  const sy = (v: number) => padT + (1 - (v - minY) / (maxY - minY)) * (height - padT - padB);
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${sx(p.x)},${sy(p.y)}`).join(' ');
  const ticks = [minY, (minY + maxY) / 2, maxY];

  return (
    <View onLayout={onLayout} style={{ height }}>
      <Svg width={width} height={height}>
        {ticks.map((t, i) => (
          <SvgText key={i} x={padL - 6} y={sy(t) + 4} fontSize={10} fill={colors.muted} textAnchor="end">
            {t.toFixed(1)}
          </SvgText>
        ))}
        {goal !== undefined && (
          <Line x1={padL} x2={width - padR} y1={sy(goal)} y2={sy(goal)} stroke={colors.success} strokeWidth={1.5} strokeDasharray="5 4" />
        )}
        <Path d={path} stroke={colors.primary} strokeWidth={2.5} fill="none" strokeLinejoin="round" />
        {points.length <= 60 &&
          points.map((p, i) => <Circle key={i} cx={sx(p.x)} cy={sy(p.y)} r={3} fill={colors.primary} />)}
        {xLabel && (
          <>
            <SvgText x={padL} y={height - 4} fontSize={10} fill={colors.muted}>
              {xLabel(minX)}
            </SvgText>
            <SvgText x={width - padR} y={height - 4} fontSize={10} fill={colors.muted} textAnchor="end">
              {xLabel(maxX)}
            </SvgText>
          </>
        )}
      </Svg>
    </View>
  );
}
