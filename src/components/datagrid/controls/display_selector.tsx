/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { ReactNode, useState, useMemo, useCallback } from 'react';

import { useUpdateEffect } from '../../../services';
import { EuiI18n, useEuiI18n } from '../../i18n';
import { EuiPopover, EuiPopoverFooter } from '../../popover';
import { EuiButtonIcon, EuiButtonGroup, EuiButtonEmpty } from '../../button';
import { EuiFormRow, EuiRange } from '../../form';
import { EuiFlexGroup, EuiFlexItem } from '../../flex';
import { EuiToolTip } from '../../tool_tip';

import {
  EuiDataGridToolBarVisibilityOptions,
  EuiDataGridStyle,
  EuiDataGridRowHeightsOptions,
} from '../data_grid_types';
import { getNestedObjectOptions } from './data_grid_toolbar';

export const startingStyles: EuiDataGridStyle = {
  cellPadding: 'm',
  fontSize: 'm',
  border: 'all',
  stripes: false,
  rowHover: 'highlight',
  header: 'shade',
  footer: 'overline',
  stickyFooter: true,
};

// These are the available options. They power the gridDensity hook and also the options in the render
const densityOptions: string[] = ['compact', 'normal', 'expanded'];
const densityStyles: { [key: string]: Partial<EuiDataGridStyle> } = {
  expanded: {
    fontSize: 'l',
    cellPadding: 'l',
  },
  normal: {
    fontSize: 'm',
    cellPadding: 'm',
  },
  compact: {
    fontSize: 's',
    cellPadding: 's',
  },
};
const convertGridStylesToSelection = (gridStyles: EuiDataGridStyle) => {
  if (gridStyles?.fontSize === 's' && gridStyles?.cellPadding === 's')
    return 'compact';
  if (gridStyles?.fontSize === 'm' && gridStyles?.cellPadding === 'm')
    return 'normal';
  if (gridStyles?.fontSize === 'l' && gridStyles?.cellPadding === 'l')
    return 'expanded';
  return '';
};

// Used to correctly format the icon name for the grid density icon
const capitalizeDensityString = (s: string) => s[0].toUpperCase() + s.slice(1);

// Row height options and utilities
const rowHeightButtonOptions: string[] = ['undefined', 'auto', 'lineCount'];
const convertRowHeightsOptionsToSelection = (
  rowHeightsOptions?: EuiDataGridRowHeightsOptions
) => {
  if (rowHeightsOptions) {
    const { defaultHeight } = rowHeightsOptions;

    if (defaultHeight === 'auto') {
      return rowHeightButtonOptions[1];
    }
    if (typeof defaultHeight === 'object' && defaultHeight?.lineCount) {
      return rowHeightButtonOptions[2];
    }
    if (
      typeof defaultHeight === 'number' ||
      (typeof defaultHeight === 'object' && defaultHeight.height)
    ) {
      return '';
    }
  }
  return rowHeightButtonOptions[0];
};

export const useDataGridDisplaySelector = (
  showDisplaySelector: EuiDataGridToolBarVisibilityOptions['showDisplaySelector'],
  initialStyles: EuiDataGridStyle,
  initialRowHeightsOptions?: EuiDataGridRowHeightsOptions
): [ReactNode, EuiDataGridStyle, EuiDataGridRowHeightsOptions] => {
  const [isOpen, setIsOpen] = useState(false);

  const showDensityControls = getNestedObjectOptions(
    showDisplaySelector,
    'allowDensity'
  );

  const showRowHeightControls = getNestedObjectOptions(
    showDisplaySelector,
    'allowRowHeight'
  );

  // Get initial state (also used when resetting)
  const initialDensity = useMemo(
    () => convertGridStylesToSelection(initialStyles),
    [initialStyles]
  );
  const initialRowHeight = useMemo(
    () => convertRowHeightsOptionsToSelection(initialRowHeightsOptions),
    [initialRowHeightsOptions]
  );
  const initialLineCount = useMemo(
    // @ts-ignore - optional chaining operator handles types & cases that aren't lineCount
    () => initialRowHeightsOptions?.defaultHeight?.lineCount || 2,
    [initialRowHeightsOptions?.defaultHeight]
  );

  // Track styles specified by the user at run time
  const [userGridStyles, setUserGridStyles] = useState({});
  const [userRowHeightsOptions, setUserRowHeightsOptions] = useState({});

  // Density state
  const [gridDensity, _setGridDensity] = useState(initialDensity);
  const setGridDensity = (density: string) => {
    _setGridDensity(density);
    setUserGridStyles(densityStyles[density]);
  };

  // Row height state
  const [lineCount, setLineCount] = useState(initialLineCount);
  const [rowHeightSelection, setRowHeightSelection] = useState(
    initialRowHeight
  );
  const setRowHeight = useCallback(
    (option: string) => {
      const rowHeightsOptions: EuiDataGridRowHeightsOptions = {
        rowHeights: {}, // Unset all row-specific heights
      };

      if (option === 'auto') {
        rowHeightsOptions.defaultHeight = 'auto';
      } else if (option === 'lineCount') {
        rowHeightsOptions.defaultHeight = { lineCount };
      } else {
        rowHeightsOptions.defaultHeight = undefined;
      }

      setRowHeightSelection(option);
      setUserRowHeightsOptions(rowHeightsOptions);
    },
    [lineCount]
  );
  const setLineCountHeight = useCallback((event) => {
    const newLineCount = Number(event.target.value);
    if (newLineCount < 1) return; // Don't let users set a 0 or negative line count

    setLineCount(newLineCount);
    setUserRowHeightsOptions({
      rowHeights: {}, // Unset all row-specific line counts
      defaultHeight: { lineCount: newLineCount },
    });
  }, []);

  // Merge the developer-specified configurations with user overrides
  const gridStyles = useMemo(() => {
    return {
      ...initialStyles,
      ...userGridStyles,
    };
  }, [initialStyles, userGridStyles]);

  const rowHeightsOptions = useMemo(() => {
    return {
      ...initialRowHeightsOptions,
      ...userRowHeightsOptions,
    };
  }, [initialRowHeightsOptions, userRowHeightsOptions]);

  // Invoke onChange callbacks on user input (removing the callback value itself, so that only configuration values are returned)
  useUpdateEffect(() => {
    const { onChange, ...currentGridStyles } = gridStyles;
    initialStyles?.onChange?.(currentGridStyles);
  }, [userGridStyles]);

  useUpdateEffect(() => {
    const { onChange, ...currentRowHeightsOptions } = rowHeightsOptions;
    initialRowHeightsOptions?.onChange?.(currentRowHeightsOptions);
  }, [userRowHeightsOptions]);

  // Allow resetting to initial developer-specified configurations
  const resetToInitialState = useCallback(() => {
    setGridDensity(initialDensity);
    setUserGridStyles({});
    setRowHeightSelection(initialRowHeight);
    setUserRowHeightsOptions({});
    setLineCount(initialLineCount);
  }, [initialDensity, initialRowHeight, initialLineCount]);

  const showResetButton = useMemo(() => {
    if (initialDensity !== gridDensity) return true;
    if (initialRowHeight !== rowHeightSelection) return true;
    if (initialLineCount !== lineCount) return true;
    return false;
  }, [
    initialDensity,
    gridDensity,
    initialRowHeight,
    rowHeightSelection,
    initialLineCount,
    lineCount,
  ]);

  const buttonLabel = useEuiI18n(
    'euiDisplaySelector.buttonText',
    'Display options'
  );
  const resetButtonLabel = useEuiI18n(
    'euiDisplaySelector.resetButtonText',
    'Reset to default'
  );

  const displaySelector =
    showDensityControls || showRowHeightControls ? (
      <EuiPopover
        data-test-subj="dataGridDisplaySelectorPopover"
        isOpen={isOpen}
        closePopover={() => setIsOpen(false)}
        anchorPosition="downRight"
        panelPaddingSize="s"
        panelClassName="euiDataGrid__displayPopoverPanel"
        button={
          <EuiToolTip content={buttonLabel} delay="long">
            <EuiButtonIcon
              size="xs"
              iconType={
                gridDensity
                  ? `tableDensity${capitalizeDensityString(gridDensity)}`
                  : 'tableDensityNormal'
              }
              className="euiDataGrid__controlBtn"
              color="text"
              data-test-subj="dataGridDisplaySelectorButton"
              onClick={() => setIsOpen(!isOpen)}
              aria-label={buttonLabel}
            />
          </EuiToolTip>
        }
      >
        {showDensityControls && (
          <EuiI18n
            tokens={[
              'euiDisplaySelector.densityLabel',
              'euiDisplaySelector.labelCompact',
              'euiDisplaySelector.labelNormal',
              'euiDisplaySelector.labelExpanded',
            ]}
            defaults={['Density', 'Compact', 'Normal', 'Expanded']}
          >
            {([
              densityLabel,
              labelCompact,
              labelNormal,
              labelExpanded,
            ]: string[]) => (
              <EuiFormRow label={densityLabel} display="columnCompressed">
                <EuiButtonGroup
                  legend={densityLabel}
                  buttonSize="compressed"
                  isFullWidth
                  options={[
                    {
                      id: densityOptions[0],
                      label: labelCompact,
                    },
                    {
                      id: densityOptions[1],
                      label: labelNormal,
                    },
                    {
                      id: densityOptions[2],
                      label: labelExpanded,
                    },
                  ]}
                  onChange={setGridDensity}
                  idSelected={gridDensity}
                  data-test-subj="densityButtonGroup"
                />
              </EuiFormRow>
            )}
          </EuiI18n>
        )}
        {showRowHeightControls && (
          <EuiI18n
            tokens={[
              'euiDisplaySelector.rowHeightLabel',
              'euiDisplaySelector.labelSingle',
              'euiDisplaySelector.labelAuto',
              'euiDisplaySelector.labelCustom',
              'euiDisplaySelector.lineCountLabel',
            ]}
            defaults={[
              'Row height',
              'Single',
              'Auto fit',
              'Custom',
              'Lines per row',
            ]}
          >
            {([
              rowHeightLabel,
              labelSingle,
              labelAuto,
              labelCustom,
              lineCountLabel,
            ]: string[]) => (
              <>
                <EuiFormRow label={rowHeightLabel} display="columnCompressed">
                  <EuiButtonGroup
                    legend={rowHeightLabel}
                    buttonSize="compressed"
                    isFullWidth
                    options={[
                      {
                        id: rowHeightButtonOptions[0],
                        label: labelSingle,
                      },
                      {
                        id: rowHeightButtonOptions[1],
                        label: labelAuto,
                      },
                      {
                        id: rowHeightButtonOptions[2],
                        label: labelCustom,
                      },
                    ]}
                    onChange={setRowHeight}
                    idSelected={rowHeightSelection}
                    data-test-subj="rowHeightButtonGroup"
                  />
                </EuiFormRow>
                {rowHeightSelection === rowHeightButtonOptions[2] && (
                  <EuiFormRow label={lineCountLabel} display="columnCompressed">
                    <EuiRange
                      compressed
                      fullWidth
                      showInput
                      min={1}
                      max={20}
                      step={1}
                      value={lineCount}
                      onChange={setLineCountHeight}
                      data-test-subj="lineCountNumber"
                    />
                  </EuiFormRow>
                )}
              </>
            )}
          </EuiI18n>
        )}
        {showResetButton && (
          <EuiPopoverFooter>
            <EuiFlexGroup justifyContent="flexEnd" responsive={false}>
              <EuiFlexItem grow={false}>
                <div>
                  <EuiButtonEmpty
                    flush="both"
                    size="xs"
                    onClick={resetToInitialState}
                    data-test-subj="resetDisplaySelector"
                  >
                    {resetButtonLabel}
                  </EuiButtonEmpty>
                </div>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPopoverFooter>
        )}
      </EuiPopover>
    ) : null;

  return [displaySelector, gridStyles, rowHeightsOptions];
};
