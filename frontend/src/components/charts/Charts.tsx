import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Title, Tooltip, Legend, Filler);

const COLORS = ['#5a67f7', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'];

export const TurnoutBarChart: React.FC<{ labels: string[]; data: number[] }> = ({ labels, data }) => (
  <Bar
    data={{
      labels,
      datasets: [
        {
          label: 'Voter Turnout %',
          data,
          backgroundColor: '#5a67f7',
          borderRadius: 6,
          maxBarThickness: 48,
        },
      ],
    }}
    options={{
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, max: 100, grid: { color: '#f1f5f9' }, ticks: { callback: (v) => `${v}%` } },
        x: { grid: { display: false } },
      },
    }}
  />
);

export const VoteDoughnutChart: React.FC<{ labels: string[]; data: number[] }> = ({ labels, data }) => (
  <Doughnut
    data={{
      labels,
      datasets: [
        {
          data,
          backgroundColor: COLORS,
          borderWidth: 2,
          borderColor: '#fff',
        },
      ],
    }}
    options={{
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { boxWidth: 12, padding: 16, font: { size: 12 } } },
      },
      cutout: '65%',
    }}
  />
);

export const ResultsBarChart: React.FC<{ labels: string[]; data: number[] }> = ({ labels, data }) => (
  <Bar
    data={{
      labels,
      datasets: [
        {
          label: 'Votes',
          data,
          backgroundColor: labels.map((_, i) => COLORS[i % COLORS.length]),
          borderRadius: 6,
        },
      ],
    }}
    options={{
      indexAxis: 'y' as const,
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { beginAtZero: true, grid: { color: '#f1f5f9' } },
        y: { grid: { display: false } },
      },
    }}
  />
);

export const TrendLineChart: React.FC<{ labels: string[]; data: number[]; label?: string }> = ({ labels, data, label = 'Votes' }) => (
  <Line
    data={{
      labels,
      datasets: [
        {
          label,
          data,
          borderColor: '#5a67f7',
          backgroundColor: 'rgba(90, 103, 247, 0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: 3,
        },
      ],
    }}
    options={{
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, grid: { color: '#f1f5f9' } },
        x: { grid: { display: false } },
      },
    }}
  />
);
