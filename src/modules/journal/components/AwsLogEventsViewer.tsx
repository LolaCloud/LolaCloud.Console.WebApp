import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Box,
  Button,
  ButtonDropdown,
  Checkbox,
  Modal,
  SpaceBetween,
  Toggle,
  StatusIndicator,
} from '@cloudscape-design/components';
import { type LogEvent } from '../../../services/journalService';

export interface AwsLogEventsViewerProps {
  title?: string;
  description?: React.ReactNode;
  events: LogEvent[];
  loading?: boolean;
  onRefresh?: () => void;
  streamName?: string;
  groupName?: string;
  containerName?: string;
  onCreateMetricFilter?: () => void;
  initialFilter?: string;
  isLiveTail?: boolean;
  isStreaming?: boolean;
  onToggleStreaming?: () => void;
  connectionStatus?: 'CONNECTING' | 'LIVE' | 'PAUSED' | 'SIMULATED';
  onClear?: () => void;
  extraHeaderActions?: React.ReactNode;
}

// Reactive hook that detects if Cloudscape or Lola is in Dark Mode
export const useIsDarkMode = (): boolean => {
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof document !== 'undefined') {
      return document.body.classList.contains('awsui-dark-mode') || localStorage.getItem('lola_theme') !== 'light';
    }
    return true;
  });

  useEffect(() => {
    const checkTheme = () => {
      const dark = document.body.classList.contains('awsui-dark-mode') || localStorage.getItem('lola_theme') !== 'light';
      setIsDark(dark);
    };

    checkTheme();

    const observer = new MutationObserver(checkTheme);
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });

    window.addEventListener('storage', checkTheme);
    window.addEventListener('lola-theme-change', checkTheme);
    return () => {
      observer.disconnect();
      window.removeEventListener('storage', checkTheme);
      window.removeEventListener('lola-theme-change', checkTheme);
    };
  }, []);

  return isDark;
};

export const AwsLogEventsViewer: React.FC<AwsLogEventsViewerProps> = ({
  title = 'Log events',
  description,
  events,
  loading = false,
  onRefresh,
  streamName,
  groupName,
  containerName,
  onCreateMetricFilter,
  initialFilter = '',
  isLiveTail = false,
  isStreaming = true,
  onToggleStreaming,
  connectionStatus = 'LIVE',
  onClear,
  extraHeaderActions,
}) => {
  const isDark = useIsDarkMode();

  const [viewAsText, setViewAsText] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [filterText, setFilterText] = useState(initialFilter);
  const [activeTimeRange, setActiveTimeRange] = useState<string | null>(null);
  const [expandedRowIds, setExpandedRowIds] = useState<Set<string>>(new Set());
  const [wrapLines, setWrapLines] = useState(true);
  const [useUtc, setUseUtc] = useState(true);
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
  const [isCustomTimeOpen, setIsCustomTimeOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  const tableScrollRef = useRef<HTMLDivElement>(null);
  const textScrollRef = useRef<HTMLPreElement>(null);

  // Theme tokens for full dark & light mode adaptation
  const theme = useMemo(() => {
    if (isDark) {
      return {
        // Outer Container
        containerBg: '#0f172a',
        containerBorder: '#1e293b',
        headerBorder: '#1e293b',
        titleColor: '#f8fafc',
        descColor: '#94a3b8',
        linkColor: '#60a5fa',

        // Action Controls row
        controlsBg: '#131d2e',
        controlsBorder: '#1e293b',

        // Search Bar row
        searchBarBg: '#0f172a',
        searchBarBorder: '#1e293b',
        searchInputBg: '#090d16',
        searchInputBorder: '#2563eb',
        searchTextColor: '#f8fafc',
        searchIconColor: '#94a3b8',

        // Time Segments
        timeSegmentBorder: '#334155',
        timeSegmentBg: '#131d2e',
        timeBtnSelectedBg: '#1d4ed8',
        timeBtnSelectedColor: '#ffffff',
        timeBtnUnselectedBg: '#131d2e',
        timeBtnUnselectedColor: '#cbd5e1',
        timeBtnDivider: '#1e293b',

        // Settings Cog
        settingsBtnBg: '#131d2e',
        settingsBtnBorder: '#334155',
        settingsBtnColor: '#94a3b8',

        // Table
        tableHeaderBg: '#131d2e',
        tableHeaderBorder: '#1e293b',
        tableHeaderColor: '#94a3b8',
        tableRowBorder: '#1e293b',
        tableRowHoverBg: '#1e293b',
        tableRowExpandedBg: '#172554',
        tableTimestampColor: '#93c5fd',
        tableMessageColor: '#f1f5f9',
        tableCaretColor: '#64748b',

        // Expanded Row Details
        expandedBg: '#0b1120',
        expandedBorder: '#1e293b',
        expandedTitleColor: '#cbd5e1',
        expandedDivider: '#1e293b',
        copyBtnBg: '#1e293b',
        copyBtnBorder: '#334155',
        copyBtnColor: '#e2e8f0',
        fieldLabelColor: '#94a3b8',
        fieldValueColor: '#f8fafc',
        fieldPreBg: '#0f172a',
        fieldPreBorder: '#1e293b',
        fieldPreColor: '#f8fafc',

        // Highlight
        highlightBg: '#eab308',
        highlightColor: '#000000',

        // Modals
        modalBtnBg: '#1e293b',
        modalBtnBorder: '#334155',
        modalBtnColor: '#f8fafc',
      };
    }

    return {
      // Light Mode (AWS CloudWatch Light defaults)
      containerBg: '#ffffff',
      containerBorder: '#d5dbdb',
      headerBorder: '#eaeded',
      titleColor: '#16191f',
      descColor: '#5f6b7a',
      linkColor: '#0972d3',

      controlsBg: '#fafafa',
      controlsBorder: '#eaeded',

      searchBarBg: '#ffffff',
      searchBarBorder: '#eaeded',
      searchInputBg: '#ffffff',
      searchInputBorder: '#0972d3',
      searchTextColor: '#16191f',
      searchIconColor: '#5f6b7a',

      timeSegmentBorder: '#d5dbdb',
      timeSegmentBg: '#ffffff',
      timeBtnSelectedBg: '#f2f8fd',
      timeBtnSelectedColor: '#0972d3',
      timeBtnUnselectedBg: '#ffffff',
      timeBtnUnselectedColor: '#16191f',
      timeBtnDivider: '#eaeded',

      settingsBtnBg: '#ffffff',
      settingsBtnBorder: '#d5dbdb',
      settingsBtnColor: '#5f6b7a',

      tableHeaderBg: '#fafafa',
      tableHeaderBorder: '#eaeded',
      tableHeaderColor: '#5f6b7a',
      tableRowBorder: '#f2f3f3',
      tableRowHoverBg: '#f8fafc',
      tableRowExpandedBg: '#f2f8fd',
      tableTimestampColor: '#16191f',
      tableMessageColor: '#16191f',
      tableCaretColor: '#5f6b7a',

      expandedBg: '#f8fafc',
      expandedBorder: '#d5dbdb',
      expandedTitleColor: '#334155',
      expandedDivider: '#e2e8f0',
      copyBtnBg: '#ffffff',
      copyBtnBorder: '#cbd5e1',
      copyBtnColor: '#334155',
      fieldLabelColor: '#64748b',
      fieldValueColor: '#0f172a',
      fieldPreBg: '#ffffff',
      fieldPreBorder: '#e2e8f0',
      fieldPreColor: '#0f172a',

      highlightBg: '#ffe380',
      highlightColor: '#16191f',

      modalBtnBg: '#ffffff',
      modalBtnBorder: '#cbd5e1',
      modalBtnColor: '#16191f',
    };
  }, [isDark]);

  // Time formatting matching AWS CloudWatch: YYYY-MM-DDTHH:mm:ss.sss+00:00
  const formatAwsTimestamp = (isoString: string): string => {
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return isoString;

      if (useUtc) {
        return d.toISOString().replace('Z', '+00:00');
      } else {
        const pad = (n: number, z = 2) => String(n).padStart(z, '0');
        const year = d.getFullYear();
        const month = pad(d.getMonth() + 1);
        const day = pad(d.getDate());
        const hours = pad(d.getHours());
        const minutes = pad(d.getMinutes());
        const seconds = pad(d.getSeconds());
        const ms = pad(d.getMilliseconds(), 3);
        const offset = -d.getTimezoneOffset();
        const sign = offset >= 0 ? '+' : '-';
        const offHours = pad(Math.floor(Math.abs(offset) / 60));
        const offMin = pad(Math.abs(offset) % 60);
        return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${ms}${sign}${offHours}:${offMin}`;
      }
    } catch {
      return isoString;
    }
  };

  // Filter events by text query and time range
  const filteredEvents = useMemo(() => {
    let result = events;

    // 1. Time range filter
    if (activeTimeRange) {
      const now = Date.now();
      let durationMs = 0;
      if (activeTimeRange === '1m') durationMs = 60 * 1000;
      else if (activeTimeRange === '30m') durationMs = 30 * 60 * 1000;
      else if (activeTimeRange === '1h') durationMs = 60 * 60 * 1000;
      else if (activeTimeRange === '12h') durationMs = 12 * 60 * 60 * 1000;

      if (durationMs > 0) {
        const cutoff = now - durationMs;
        result = result.filter((e) => new Date(e.timestamp).getTime() >= cutoff);
      }
    }

    // 2. Keyword / pattern filter
    if (filterText.trim()) {
      const query = filterText.toLowerCase();
      result = result.filter((e) => {
        if (e.message.toLowerCase().includes(query)) return true;
        if (e.level && e.level.toLowerCase().includes(query)) return true;
        if (e.timestamp.toLowerCase().includes(query)) return true;
        if (e.attributes && JSON.stringify(e.attributes).toLowerCase().includes(query)) return true;
        return false;
      });
    }

    return result;
  }, [events, filterText, activeTimeRange]);

  // Auto-scroll to bottom on new events when enabled
  useEffect(() => {
    if (!autoScroll) return;
    if (viewAsText && textScrollRef.current) {
      textScrollRef.current.scrollTop = textScrollRef.current.scrollHeight;
    } else if (tableScrollRef.current) {
      tableScrollRef.current.scrollTop = tableScrollRef.current.scrollHeight;
    }
  }, [filteredEvents.length, autoScroll, viewAsText]);

  const toggleRowExpanded = (id: string) => {
    setExpandedRowIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCopy = (text: string, id: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleCopyAll = () => {
    const allText = filteredEvents
      .map((e) => `${formatAwsTimestamp(e.timestamp)} ${e.message}`)
      .join('\n');
    if (navigator.clipboard) {
      navigator.clipboard.writeText(allText);
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2000);
    }
  };

  const handleDownloadCsv = () => {
    const csvContent =
      'Timestamp,Level,Message\n' +
      filteredEvents
        .map(
          (e) =>
            `"${formatAwsTimestamp(e.timestamp)}","${e.level}","${e.message.replace(/"/g, '""')}"`
        )
        .join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `log-events-${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadJson = () => {
    const jsonContent = JSON.stringify(filteredEvents, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `log-events-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Text highlighting for search matches
  const renderHighlightedMessage = (text: string, search: string) => {
    if (!search.trim()) return text;
    const parts = text.split(new RegExp(`(${search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === search.toLowerCase() ? (
        <span
          key={i}
          style={{
            backgroundColor: theme.highlightBg,
            color: theme.highlightColor,
            fontWeight: 600,
            borderRadius: '2px',
            padding: '0 2px',
          }}
        >
          {part}
        </span>
      ) : (
        part
      )
    );
  };

  return (
    <div
      className="aws-log-events-viewer"
      style={{
        backgroundColor: theme.containerBg,
        border: `1px solid ${theme.containerBorder}`,
        borderRadius: '8px',
        overflow: 'hidden',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      {/* 1. Header Section */}
      <div style={{ padding: '16px 20px 12px 20px', borderBottom: `1px solid ${theme.headerBorder}` }}>
        <div style={{ fontSize: '18px', fontWeight: 700, color: theme.titleColor, marginBottom: '4px' }}>
          {title}
        </div>
        <div style={{ fontSize: '13px', color: theme.descColor, lineHeight: '18px' }}>
          {description || (
            <>
              You can use the filter bar below to search for and match terms, phrases, or values in your log events.{' '}
              <a
                href="https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/FilterAndPatternSyntax.html"
                target="_blank"
                rel="noreferrer"
                style={{ color: theme.linkColor, textDecoration: 'none' }}
              >
                Learn more about filter patterns &#x2197;
              </a>
            </>
          )}
        </div>
      </div>

      {/* 2. Action Controls Row */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '10px 20px',
          backgroundColor: theme.controlsBg,
          borderBottom: `1px solid ${theme.controlsBorder}`,
          flexWrap: 'wrap',
          gap: '10px',
        }}
      >
        {/* Left Side: View as text, Auto-scroll, Live status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Checkbox checked={viewAsText} onChange={({ detail }) => setViewAsText(detail.checked)}>
            View as text
          </Checkbox>
          {isLiveTail && (
            <>
              <Checkbox checked={autoScroll} onChange={({ detail }) => setAutoScroll(detail.checked)}>
                Auto-scroll
              </Checkbox>
              <div style={{ display: 'flex', alignItems: 'center', marginLeft: '4px' }}>
                {connectionStatus === 'LIVE' && (
                  <StatusIndicator type="success">Tail connected</StatusIndicator>
                )}
                {connectionStatus === 'CONNECTING' && (
                  <StatusIndicator type="in-progress">Connecting</StatusIndicator>
                )}
                {connectionStatus === 'PAUSED' && (
                  <StatusIndicator type="stopped">Tail paused</StatusIndicator>
                )}
                {connectionStatus === 'SIMULATED' && (
                  <StatusIndicator type="info">Simulated tail</StatusIndicator>
                )}
              </div>
            </>
          )}
        </div>

        {/* Right Side: Streaming controls, Refresh, Actions, Create Metric Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isLiveTail && onToggleStreaming && (
            <Button
              iconName={isStreaming ? 'status-stopped' : 'status-positive'}
              onClick={onToggleStreaming}
            >
              {isStreaming ? 'Pause' : 'Resume'}
            </Button>
          )}
          {isLiveTail && onClear && (
            <Button iconName="remove" onClick={onClear}>
              Clear
            </Button>
          )}
          {onRefresh && (
            <Button
              iconName="refresh"
              ariaLabel="Refresh log events"
              loading={loading}
              onClick={onRefresh}
            />
          )}
          <ButtonDropdown
            items={[
              { id: 'download-csv', text: 'Download search results (CSV)' },
              { id: 'download-json', text: 'Download search results (JSON)' },
              { id: 'copy-query', text: 'Copy search query' },
              { id: 'metric-filter', text: 'Create metric filter' },
            ]}
            onItemClick={({ detail }) => {
              if (detail.id === 'download-csv') handleDownloadCsv();
              else if (detail.id === 'download-json') handleDownloadJson();
              else if (detail.id === 'copy-query') {
                if (navigator.clipboard) navigator.clipboard.writeText(filterText);
              } else if (detail.id === 'metric-filter') {
                if (onCreateMetricFilter) onCreateMetricFilter();
              }
            }}
          >
            Actions
          </ButtonDropdown>
          <button
            type="button"
            onClick={onCreateMetricFilter}
            style={{
              backgroundColor: '#ec7211',
              color: '#ffffff',
              border: 'none',
              borderRadius: '16px',
              padding: '6px 14px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'background-color 0.15s ease-in-out',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#eb5f07')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ec7211')}
          >
            Create Metric Filter
          </button>
          {extraHeaderActions}
        </div>
      </div>

      {/* 3. AWS Filter & Search Bar Row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '10px 20px',
          gap: '8px',
          borderBottom: `1px solid ${theme.searchBarBorder}`,
          backgroundColor: theme.searchBarBg,
        }}
      >
        {/* Search input with magnifying glass and clear button */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            border: `2px solid ${theme.searchInputBorder}`,
            borderRadius: '4px',
            padding: '2px 8px',
            backgroundColor: theme.searchInputBg,
            boxShadow: `0 0 0 1px ${theme.searchInputBorder}`,
          }}
        >
          <span style={{ color: theme.searchIconColor, marginRight: '8px', display: 'flex', alignItems: 'center' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </span>
          <input
            type="text"
            value={filterText}
            placeholder="Press enter to search"
            onChange={(e) => setFilterText(e.target.value)}
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              fontSize: '13px',
              color: theme.searchTextColor,
              backgroundColor: 'transparent',
              fontFamily: 'monospace, Consolas, Monaco, "Courier New"',
            }}
          />
          {filterText && (
            <button
              type="button"
              onClick={() => setFilterText('')}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: theme.searchIconColor,
                fontSize: '14px',
                padding: '0 4px',
                display: 'flex',
                alignItems: 'center',
              }}
              title="Clear search"
            >
              &#x2715;
            </button>
          )}
        </div>

        {/* Time Segmented Buttons: [Clear] [1m] [30m] [1h] [12h] [Custom 📅] */}
        <div
          style={{
            display: 'inline-flex',
            borderRadius: '4px',
            border: `1px solid ${theme.timeSegmentBorder}`,
            overflow: 'hidden',
            backgroundColor: theme.timeSegmentBg,
          }}
        >
          {['Clear', '1m', '30m', '1h', '12h', 'Custom'].map((item, idx) => {
            const isSelected = item === 'Clear' ? activeTimeRange === null : activeTimeRange === item;
            return (
              <button
                key={item}
                type="button"
                onClick={() => {
                  if (item === 'Clear') {
                    setActiveTimeRange(null);
                  } else if (item === 'Custom') {
                    setIsCustomTimeOpen(true);
                  } else {
                    setActiveTimeRange(item);
                  }
                }}
                style={{
                  padding: '5px 12px',
                  fontSize: '13px',
                  fontWeight: isSelected ? 600 : 400,
                  color: isSelected ? theme.timeBtnSelectedColor : theme.timeBtnUnselectedColor,
                  backgroundColor: isSelected ? theme.timeBtnSelectedBg : theme.timeBtnUnselectedBg,
                  border: 'none',
                  borderRight: idx < 5 ? `1px solid ${theme.timeBtnDivider}` : 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'background-color 0.15s ease',
                }}
              >
                {item}
                {item === 'Custom' && (
                  <span style={{ fontSize: '11px' }}>&#128197;</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Settings Gear Button */}
        <button
          type="button"
          onClick={() => setIsPreferencesOpen(true)}
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '4px',
            border: `1px solid ${theme.settingsBtnBorder}`,
            backgroundColor: theme.settingsBtnBg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: theme.settingsBtnColor,
            transition: 'background-color 0.15s ease',
          }}
          title="Display Preferences"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </div>

      {/* 4. Table or View As Text Mode */}
      {viewAsText ? (
        /* View As Text Raw Mode */
        <div style={{ position: 'relative', backgroundColor: isDark ? '#0b1120' : '#0f172a', padding: '16px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '10px',
              color: '#94a3b8',
              fontSize: '12px',
            }}
          >
            <span>Showing {filteredEvents.length} log lines (Raw Text Mode)</span>
            <button
              type="button"
              onClick={handleCopyAll}
              style={{
                backgroundColor: '#334155',
                color: '#f8fafc',
                border: 'none',
                borderRadius: '4px',
                padding: '4px 10px',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              {copiedAll ? 'Copied all!' : 'Copy all'}
            </button>
          </div>
          <pre
            ref={textScrollRef}
            style={{
              margin: 0,
              fontFamily: 'monospace, Consolas, Monaco, "Courier New"',
              fontSize: '12.5px',
              lineHeight: '1.6',
              color: '#e2e8f0',
              maxHeight: '600px',
              overflowY: 'auto',
              whiteSpace: wrapLines ? 'pre-wrap' : 'pre',
              wordBreak: 'break-all',
            }}
          >
            {filteredEvents.length === 0 ? (
              <span style={{ color: '#64748b' }}>No log events match your filter pattern.</span>
            ) : (
              filteredEvents.map((e) => (
                <div key={e.id}>
                  <span style={{ color: '#94a3b8', marginRight: '10px' }}>
                    {formatAwsTimestamp(e.timestamp)}
                  </span>
                  <span>{e.message}</span>
                </div>
              ))
            )}
          </pre>
        </div>
      ) : (
        /* AWS CloudWatch Standard Table View */
        <div ref={tableScrollRef} style={{ overflowX: 'auto', maxHeight: '680px', overflowY: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontFamily: 'monospace, Consolas, Monaco, "Courier New"',
              fontSize: '12.5px',
              textAlign: 'left',
            }}
          >
            <thead>
              <tr
                style={{
                  backgroundColor: theme.tableHeaderBg,
                  borderBottom: `1px solid ${theme.tableHeaderBorder}`,
                  color: theme.tableHeaderColor,
                  fontWeight: 600,
                  fontSize: '12px',
                }}
              >
                <th style={{ width: '36px', padding: '8px 4px 8px 12px' }}>
                  <span style={{ opacity: 0.5, fontSize: '10px' }}>&#9654;</span>
                </th>
                <th style={{ width: '230px', padding: '8px 12px', whiteSpace: 'nowrap' }}>
                  Timestamp
                </th>
                <th style={{ padding: '8px 12px' }}>Message</th>
              </tr>
            </thead>
            <tbody>
              {filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan={3} style={{ padding: '32px 16px', textAlign: 'center', color: theme.descColor }}>
                    {loading ? (
                      'Loading log events from Lola Journal buffer...'
                    ) : (
                      <div>
                        <div style={{ fontWeight: 600, marginBottom: '4px' }}>No events match your filter</div>
                        <div style={{ fontSize: '12px' }}>
                          Try clearing the search query or selecting a wider time range.
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
              ) : (
                filteredEvents.map((event) => {
                  const isExpanded = expandedRowIds.has(event.id);
                  return (
                    <React.Fragment key={event.id}>
                      <tr
                        onClick={() => toggleRowExpanded(event.id)}
                        style={{
                          borderBottom: `1px solid ${theme.tableRowBorder}`,
                          backgroundColor: isExpanded ? theme.tableRowExpandedBg : 'transparent',
                          cursor: 'pointer',
                          transition: 'background-color 0.1s ease',
                        }}
                        onMouseEnter={(e) => {
                          if (!isExpanded) e.currentTarget.style.backgroundColor = theme.tableRowHoverBg;
                        }}
                        onMouseLeave={(e) => {
                          if (!isExpanded) e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        {/* Caret Column */}
                        <td
                          style={{
                            padding: '6px 4px 6px 12px',
                            color: theme.tableCaretColor,
                            verticalAlign: 'top',
                            fontSize: '10px',
                            userSelect: 'none',
                          }}
                        >
                          <span
                            style={{
                              display: 'inline-block',
                              transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                              transition: 'transform 0.15s ease',
                            }}
                          >
                            &#9654;
                          </span>
                        </td>

                        {/* Timestamp Column */}
                        <td
                          style={{
                            padding: '6px 12px',
                            color: theme.tableTimestampColor,
                            verticalAlign: 'top',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {formatAwsTimestamp(event.timestamp)}
                        </td>

                        {/* Message Column */}
                        <td
                          style={{
                            padding: '6px 12px',
                            color: theme.tableMessageColor,
                            verticalAlign: 'top',
                            wordBreak: 'break-all',
                            whiteSpace: wrapLines ? 'normal' : 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {renderHighlightedMessage(event.message, filterText)}
                        </td>
                      </tr>

                      {/* Expanded Row Details */}
                      {isExpanded && (
                        <tr>
                          <td
                            colSpan={3}
                            style={{
                              backgroundColor: theme.expandedBg,
                              borderBottom: `1px solid ${theme.expandedBorder}`,
                              padding: '12px 16px 14px 44px',
                            }}
                          >
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              <div
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  borderBottom: `1px solid ${theme.expandedDivider}`,
                                  paddingBottom: '6px',
                                }}
                              >
                                <span style={{ fontWeight: 600, color: theme.expandedTitleColor, fontSize: '12px' }}>
                                  Log Event Fields
                                </span>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleCopy(event.message, `msg-${event.id}`);
                                    }}
                                    style={{
                                      backgroundColor: theme.copyBtnBg,
                                      border: `1px solid ${theme.copyBtnBorder}`,
                                      borderRadius: '4px',
                                      padding: '2px 8px',
                                      fontSize: '11px',
                                      cursor: 'pointer',
                                      color: theme.copyBtnColor,
                                      transition: 'background-color 0.15s ease',
                                    }}
                                  >
                                    {copiedId === `msg-${event.id}` ? 'Copied Message!' : 'Copy Message'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleCopy(JSON.stringify(event, null, 2), `json-${event.id}`);
                                    }}
                                    style={{
                                      backgroundColor: theme.copyBtnBg,
                                      border: `1px solid ${theme.copyBtnBorder}`,
                                      borderRadius: '4px',
                                      padding: '2px 8px',
                                      fontSize: '11px',
                                      cursor: 'pointer',
                                      color: theme.copyBtnColor,
                                      transition: 'background-color 0.15s ease',
                                    }}
                                  >
                                    {copiedId === `json-${event.id}` ? 'Copied JSON!' : 'Copy JSON'}
                                  </button>
                                </div>
                              </div>

                              {/* Formatted Key-Value Pairs */}
                              <div
                                style={{
                                  display: 'grid',
                                  gridTemplateColumns: '150px 1fr',
                                  gap: '6px',
                                  fontSize: '12px',
                                }}
                              >
                                <span style={{ color: theme.fieldLabelColor }}>@timestamp</span>
                                <span style={{ color: theme.fieldValueColor }}>{formatAwsTimestamp(event.timestamp)}</span>

                                <span style={{ color: theme.fieldLabelColor }}>@logStream</span>
                                <span style={{ color: theme.fieldValueColor }}>{streamName || containerName || event.streamId}</span>

                                <span style={{ color: theme.fieldLabelColor }}>@logGroup</span>
                                <span style={{ color: theme.fieldValueColor }}>{groupName || '/lola/relate/instances'}</span>

                                <span style={{ color: theme.fieldLabelColor }}>@level</span>
                                <span
                                  style={{
                                    display: 'inline-block',
                                    fontWeight: 700,
                                    color:
                                      event.level === 'ERROR'
                                        ? '#ef4444'
                                        : event.level === 'WARN'
                                        ? '#f59e0b'
                                        : '#3b82f6',
                                  }}
                                >
                                  {event.level || 'INFO'}
                                </span>

                                <span style={{ color: theme.fieldLabelColor }}>@message</span>
                                <div style={{ minWidth: 0 }}>
                                  <pre
                                    style={{
                                      margin: 0,
                                      padding: '6px 10px',
                                      backgroundColor: theme.fieldPreBg,
                                      border: `1px solid ${theme.fieldPreBorder}`,
                                      borderRadius: '4px',
                                      whiteSpace: 'pre-wrap',
                                      wordBreak: 'break-all',
                                      color: theme.fieldPreColor,
                                      maxHeight: '200px',
                                      overflowY: 'auto',
                                    }}
                                  >
                                    {event.message}
                                  </pre>
                                </div>

                                {event.attributes && Object.keys(event.attributes).length > 0 && (
                                  <>
                                    <span style={{ color: theme.fieldLabelColor }}>@attributes</span>
                                    <div style={{ minWidth: 0 }}>
                                      <pre
                                        style={{
                                          margin: 0,
                                          padding: '6px 10px',
                                          backgroundColor: theme.fieldPreBg,
                                          border: `1px solid ${theme.fieldPreBorder}`,
                                          borderRadius: '4px',
                                          whiteSpace: 'pre-wrap',
                                          wordBreak: 'break-all',
                                          color: theme.fieldPreColor,
                                        }}
                                      >
                                        {JSON.stringify(event.attributes, null, 2)}
                                      </pre>
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* 5. Custom Time Range Modal */}
      <Modal
        visible={isCustomTimeOpen}
        onDismiss={() => setIsCustomTimeOpen(false)}
        header="Custom Time Range"
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button variant="link" onClick={() => setIsCustomTimeOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  setActiveTimeRange('1h');
                  setIsCustomTimeOpen(false);
                }}
              >
                Apply Range
              </Button>
            </SpaceBetween>
          </Box>
        }
      >
        <SpaceBetween size="m">
          <Box variant="p">
            Select a relative or absolute time period to narrow down log events:
          </Box>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {['1m', '30m', '1h', '12h'].map((rng) => (
              <button
                key={rng}
                type="button"
                onClick={() => {
                  setActiveTimeRange(rng);
                  setIsCustomTimeOpen(false);
                }}
                style={{
                  padding: '8px',
                  cursor: 'pointer',
                  border: `1px solid ${theme.modalBtnBorder}`,
                  borderRadius: '4px',
                  backgroundColor: theme.modalBtnBg,
                  color: theme.modalBtnColor,
                  fontWeight: activeTimeRange === rng ? 600 : 400,
                  transition: 'background-color 0.15s ease',
                }}
              >
                Last {rng === '1m' ? '1 minute' : rng === '30m' ? '30 minutes' : rng === '1h' ? '1 hour' : '12 hours'}
              </button>
            ))}
          </div>
        </SpaceBetween>
      </Modal>

      {/* 6. Display Preferences Modal */}
      <Modal
        visible={isPreferencesOpen}
        onDismiss={() => setIsPreferencesOpen(false)}
        header="Log Display Preferences"
        footer={
          <Box float="right">
            <Button variant="primary" onClick={() => setIsPreferencesOpen(false)}>
              Done
            </Button>
          </Box>
        }
      >
        <SpaceBetween size="m">
          <Toggle checked={wrapLines} onChange={({ detail }) => setWrapLines(detail.checked)}>
            Wrap long log lines
          </Toggle>
          <Toggle checked={useUtc} onChange={({ detail }) => setUseUtc(detail.checked)}>
            Display timestamps in UTC (disable for local machine timezone)
          </Toggle>
        </SpaceBetween>
      </Modal>
    </div>
  );
};
