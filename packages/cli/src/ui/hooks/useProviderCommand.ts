/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback } from 'react';
import { getProviderManager } from '../../providers/providerManagerInstance.js';

interface UseProviderCommandReturn {
  isProviderDialogOpen: boolean;
  openProviderDialog: () => void;
  closeProviderDialog: () => void;
  providers: string[];
  currentProvider: string;
}

export const useProviderCommand = (): UseProviderCommandReturn => {
  const [isProviderDialogOpen, setIsProviderDialogOpen] = useState(false);
  const [providers, setProviders] = useState<string[]>([]);
  const [currentProvider, setCurrentProvider] = useState<string>('');

  const openProviderDialog = useCallback(() => {
    try {
      const providerManager = getProviderManager();
      setProviders(providerManager.listProviders());
      setCurrentProvider(providerManager.getActiveProviderName());
      setIsProviderDialogOpen(true);
    } catch (error) {
      console.error('Failed to load providers:', error);
      setProviders([]);
      setCurrentProvider('');
      setIsProviderDialogOpen(true);
    }
  }, []);

  const closeProviderDialog = useCallback(() => {
    setIsProviderDialogOpen(false);
  }, []);

  return {
    isProviderDialogOpen,
    openProviderDialog,
    closeProviderDialog,
    providers,
    currentProvider,
  };
};
