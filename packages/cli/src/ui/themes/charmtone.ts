/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { type ColorsTheme, Theme } from './theme.js';

const charmtoneColors: ColorsTheme = {
  type: 'dark',
  Background: '#201F26', // Pepper
  Foreground: '#DFDBDD', // Ash
  LightBlue: '#4FBEFE', // Sardine
  AccentBlue: '#00A4FF', // Malibu
  AccentPurple: '#6B50FF', // Charple
  AccentCyan: '#0ADCD9', // Turtle
  AccentGreen: '#12C78F', // Guac
  AccentYellow: '#E8FE96', // Zest
  AccentRed: '#EB4268', // Sriracha
  DiffAdded: '#2b322a', // Dark green background from Crush diff view
  DiffRemoved: '#312929', // Dark red background from Crush diff view
  Comment: '#605F6B', // Oyster
  Gray: '#858392', // Squid
  GradientColors: ['#6B50FF', '#AD6EFF', '#FF60FF'], // Charple → Mauve → Dolly (purple to pink gradient)
};

export const Charmtone: Theme = new Theme(
  'Charmtone',
  'dark',
  {
    hljs: {
      display: 'block',
      overflowX: 'auto',
      padding: '0.5em',
      background: charmtoneColors.Background,
      color: charmtoneColors.Foreground,
    },
    'hljs-keyword': {
      color: charmtoneColors.AccentBlue,
    },
    'hljs-literal': {
      color: charmtoneColors.AccentBlue,
    },
    'hljs-symbol': {
      color: charmtoneColors.AccentBlue,
    },
    'hljs-name': {
      color: charmtoneColors.AccentBlue,
    },
    'hljs-link': {
      color: charmtoneColors.AccentBlue,
      textDecoration: 'underline',
    },
    'hljs-built_in': {
      color: charmtoneColors.AccentCyan,
    },
    'hljs-type': {
      color: charmtoneColors.AccentCyan,
    },
    'hljs-number': {
      color: charmtoneColors.AccentGreen,
    },
    'hljs-class': {
      color: charmtoneColors.AccentGreen,
    },
    'hljs-string': {
      color: charmtoneColors.AccentYellow,
    },
    'hljs-meta-string': {
      color: charmtoneColors.AccentYellow,
    },
    'hljs-regexp': {
      color: charmtoneColors.AccentRed,
    },
    'hljs-template-tag': {
      color: charmtoneColors.AccentRed,
    },
    'hljs-subst': {
      color: charmtoneColors.Foreground,
    },
    'hljs-function': {
      color: charmtoneColors.Foreground,
    },
    'hljs-title': {
      color: charmtoneColors.Foreground,
    },
    'hljs-params': {
      color: charmtoneColors.Foreground,
    },
    'hljs-formula': {
      color: charmtoneColors.Foreground,
    },
    'hljs-comment': {
      color: charmtoneColors.Comment,
      fontStyle: 'italic',
    },
    'hljs-quote': {
      color: charmtoneColors.Comment,
      fontStyle: 'italic',
    },
    'hljs-doctag': {
      color: charmtoneColors.Comment,
    },
    'hljs-meta': {
      color: charmtoneColors.Gray,
    },
    'hljs-meta-keyword': {
      color: charmtoneColors.Gray,
    },
    'hljs-tag': {
      color: charmtoneColors.Gray,
    },
    'hljs-variable': {
      color: charmtoneColors.AccentPurple,
    },
    'hljs-template-variable': {
      color: charmtoneColors.AccentPurple,
    },
    'hljs-attr': {
      color: charmtoneColors.LightBlue,
    },
    'hljs-attribute': {
      color: charmtoneColors.LightBlue,
    },
    'hljs-builtin-name': {
      color: charmtoneColors.LightBlue,
    },
    'hljs-section': {
      color: charmtoneColors.AccentYellow,
    },
    'hljs-emphasis': {
      fontStyle: 'italic',
    },
    'hljs-strong': {
      fontWeight: 'bold',
    },
    'hljs-bullet': {
      color: charmtoneColors.AccentYellow,
    },
    'hljs-selector-tag': {
      color: charmtoneColors.AccentYellow,
    },
    'hljs-selector-id': {
      color: charmtoneColors.AccentYellow,
    },
    'hljs-selector-class': {
      color: charmtoneColors.AccentYellow,
    },
    'hljs-selector-attr': {
      color: charmtoneColors.AccentYellow,
    },
    'hljs-selector-pseudo': {
      color: charmtoneColors.AccentYellow,
    },
    'hljs-addition': {
      backgroundColor: charmtoneColors.DiffAdded,
      display: 'inline-block',
      width: '100%',
    },
    'hljs-deletion': {
      backgroundColor: charmtoneColors.DiffRemoved,
      display: 'inline-block',
      width: '100%',
    },
  },
  charmtoneColors,
);
