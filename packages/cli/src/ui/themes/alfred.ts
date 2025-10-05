/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { type ColorsTheme, Theme } from './theme.js';

const alfredColors: ColorsTheme = {
  type: 'dark',
  Background: '#201F26',
  Foreground: '#DFDBDD',
  LightBlue: '#4FBEFE',
  AccentBlue: '#858392',
  AccentPurple: '#12C78F',
  AccentCyan: '#0ADCD9',
  AccentGreen: '#12C78F',
  AccentYellow: '#E8FE96',
  AccentRed: '#EB4268',
  DiffAdded: '#11431d',
  DiffRemoved: '#6e1818',
  Comment: '#605F6B',
  Gray: '#858392',
  GradientColors: ['#6B50FF', '#AD6EFF', '#FF60FF'],
};

export const Alfred: Theme = new Theme(
  'Alfred',
  'dark',
  {
    hljs: {
      display: 'block',
      overflowX: 'auto',
      padding: '0.5em',
      background: alfredColors.Background,
      color: alfredColors.Foreground,
    },
    'hljs-keyword': {
      color: alfredColors.AccentBlue,
      fontWeight: 'bold',
    },
    'hljs-selector-tag': {
      color: alfredColors.AccentBlue,
      fontWeight: 'bold',
    },
    'hljs-literal': {
      color: alfredColors.AccentBlue,
      fontWeight: 'bold',
    },
    'hljs-section': {
      color: alfredColors.AccentBlue,
      fontWeight: 'bold',
    },
    'hljs-link': {
      color: alfredColors.AccentBlue,
    },
    'hljs-function .hljs-keyword': {
      color: alfredColors.AccentPurple,
    },
    'hljs-subst': {
      color: alfredColors.Foreground,
    },
    'hljs-string': {
      color: alfredColors.AccentYellow,
    },
    'hljs-title': {
      color: alfredColors.AccentYellow,
      fontWeight: 'bold',
    },
    'hljs-name': {
      color: alfredColors.AccentYellow,
      fontWeight: 'bold',
    },
    'hljs-type': {
      color: alfredColors.AccentYellow,
      fontWeight: 'bold',
    },
    'hljs-attribute': {
      color: alfredColors.AccentYellow,
    },
    'hljs-symbol': {
      color: alfredColors.AccentYellow,
    },
    'hljs-bullet': {
      color: alfredColors.AccentYellow,
    },
    'hljs-addition': {
      color: alfredColors.AccentGreen,
    },
    'hljs-variable': {
      color: alfredColors.AccentYellow,
    },
    'hljs-template-tag': {
      color: alfredColors.AccentYellow,
    },
    'hljs-template-variable': {
      color: alfredColors.AccentYellow,
    },
    'hljs-comment': {
      color: alfredColors.Comment,
    },
    'hljs-quote': {
      color: alfredColors.Comment,
    },
    'hljs-deletion': {
      color: alfredColors.AccentRed,
    },
    'hljs-meta': {
      color: alfredColors.Comment,
    },
    'hljs-doctag': {
      fontWeight: 'bold',
    },
    'hljs-strong': {
      fontWeight: 'bold',
    },
    'hljs-emphasis': {
      fontStyle: 'italic',
    },
  },
  alfredColors,
);
