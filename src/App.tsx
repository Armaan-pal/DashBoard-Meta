import React, { useEffect, useMemo, useRef, useState } from 'react'
import Papa from 'papaparse'
import { ComposedChart, Area, XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer, CartesianGrid, Legend, BarChart, Bar, Line } from 'recharts'
import { Download, Upload, Share2, RefreshCcw, Database, Search, Calendar } from 'lucide-react'



interface ProgressBarProps {
  percent: number;
  label: string;
}

interface KpiCardProps {
  title: string;
  value: number | string;
  hint: string;
}


// Missing components - implementing inline
const ProgressBar: React.FC<ProgressBarProps> = ({ percent, label }) => (
  <div className="w-full">
    <div className="w-full bg-gray-200 rounded-full h-2">
      <div 
        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
        style={{ width: `${percent}%` }}
      />
    </div>
    <div className="text-sm text-gray-600 mt-1">{label}</div>
  </div>
)

const KpiCard: React.FC<KpiCardProps> = ({ title, value, hint }) => (
  <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
    <div className="text-sm text-gray-500 font-medium">{title}</div>
    <div className="text-2xl font-bold text-gray-900 mt-1">{value}</div>
    <div className="text-xs text-gray-400 mt-1">{hint}</div>
  </div>
)



const REQUIRED_FIELDS = [
  { key: 'date', label: 'Date' },
  { key: 'campaign', label: 'Campaign' },
  { key: 'adset', label: 'Ad Set' },
  { key: 'ad', label: 'Ad' },
  { key: 'spend', label: 'Spend' },
  { key: 'impressions', label: 'Impressions' },
  { key: 'clicks', label: 'Clicks' },
  { key: 'conversions', label: 'Conversions' },
  { key: 'revenue', label: 'Revenue' },
] as const

type Row = Record<string, any>
type Norm = {
  date: string | null
  campaign: string
  adset: string
  ad: string
  spend: number
  impressions: number
  clicks: number
  conversions: number
  revenue: number
}

function parseNumber(v: any) {
  if (v === null || v === undefined || v === '') return 0
  const c = String(v).replace(/[,₹$€£]/g, '').trim()
  const n = Number(c)
  return isNaN(n) ? 0 : n
}

function toDate(v: any) {
  console.log('📅 Date parsing input:', v, typeof v)
  
  if (!v) {
    console.log('❌ Empty date value')
    return null
  }
  
  // Handle different date formats
  const dateStr = String(v).trim()
  console.log('Date string to parse:', `"${dateStr}"`)
  
  // Check if it's in DD-MM-YYYY format (like 29-01-2025)
  if (dateStr.match(/^\d{1,2}-\d{1,2}-\d{4}$/)) {
    console.log('✅ Detected DD-MM-YYYY format')
    const [day, month, year] = dateStr.split('-')
    const d = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
    console.log('Parsed as:', d, 'Valid:', !isNaN(d.getTime()))
    return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10)
  }
  
  // Check if it's in DD/MM/YYYY format (like 29/01/2025)
  if (dateStr.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
    console.log('✅ Detected DD/MM/YYYY format')
    const [day, month, year] = dateStr.split('/')
    const d = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
    console.log('Parsed as:', d, 'Valid:', !isNaN(d.getTime()))
    return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10)
  }
  
  // Check for YYYY-MM-DD format (ISO format)
  if (dateStr.match(/^\d{4}-\d{1,2}-\d{1,2}$/)) {
    console.log('✅ Detected YYYY-MM-DD format')
    const d = new Date(dateStr)
    console.log('Parsed as:', d, 'Valid:', !isNaN(d.getTime()))
    return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10)
  }
  
  // Try standard date parsing for other formats
  console.log('⚠️ Trying standard Date() parsing')
  const d = new Date(dateStr)
  console.log('Standard parsing result:', d, 'Valid:', !isNaN(d.getTime()))
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10)
}

const niceNumber = (n: number, digits = 0) => {
  if (n === 0) return '0'
  const abs = Math.abs(n)
  const fmt = (x: number) => x.toLocaleString(undefined, { maximumFractionDigits: digits })
  if (abs >= 1_000_000_000) return fmt(n / 1_000_000_000) + 'B'
  if (abs >= 1_000_000) return fmt(n / 1_000_000) + 'M'
  if (abs >= 1_000) return fmt(n / 1_000) + 'K'
  return fmt(n)
}

const sum = (arr: Norm[], key: keyof Norm) => arr.reduce((acc, r) => acc + ((r[key] as any) ?? 0), 0)

// const sampleCsv = `date,campaign,adset,ad,spend,impressions,clicks,conversions,revenue
// 2025-08-01,Prospecting - TOF,Lookalike 2%,UGC_01,250,52000,1400,22,1200
// 2025-08-01,Retargeting - MOF,ATC 14d,Carousel_02,120,18000,900,35,1750
// 2025-08-01,Retargeting - BOF,ViewContent 7d,Static_Offer,80,9000,420,19,1100
// 2025-08-02,Prospecting - TOF,Interest_Fashion,UGC_02,180,41000,1000,15,800
// 2025-08-02,Retargeting - MOF,ATC 14d,Carousel_02,110,17000,820,28,1400
// 2025-08-02,Retargeting - BOF,ViewContent 7d,Static_Offer,70,8500,380,17,950
// 2025-08-03,Prospecting - TOF,Lookalike 2%,UGC_01,220,50000,1320,20,1150
// 2025-08-03,Retargeting - MOF,ATC 14d,Carousel_03,130,19000,940,33,1680
// 2025-08-03,Retargeting - BOF,ViewContent 7d,Static_Offer,85,9700,450,18,980
// 2025-08-04,Prospecting - TOF,Lookalike 2%,UGC_01,300,58000,1600,25,1400
// 2025-08-05,Retargeting - MOF,ATC 14d,Carousel_02,140,20000,1050,40,2000`

export default function App() {
  const [rows, setRows] = useState<Row[]>([])
  const [mapping, setMapping] = useState<Record<string, string>>(
    Object.fromEntries(REQUIRED_FIELDS.map(f => [f.key, f.key]))
  )
  const [rawHeaders, setRawHeaders] = useState<string[]>([])
  const [groupBy, setGroupBy] = useState<'campaign'|'adset'|'ad'>('campaign')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [view, setView] = useState<'overview'|'by-dimension'|'table'>('overview')
  const [filterCampaign, setFilterCampaign] = useState('all')
  const [filterAdset, setFilterAdset] = useState('all')
  const [filterAd, setFilterAd] = useState('all')
  const [uploadFileName, setUploadFileName] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [uploadPct, setUploadPct] = useState(0)
  const [isComputing, setIsComputing] = useState(false)
  const [computePct, setComputePct] = useState(0)
  const [isKpiLoading, setIsKpiLoading] = useState(false)
  const [kpiPct, setKpiPct] = useState(0)
  const [showMapping, setShowMapping] = useState(false)
  
  // New states for date data fetching
  const [selectedDateData, setSelectedDateData] = useState<Norm[]>([])
  const [showDateData, setShowDateData] = useState(false)

  const fileRef = useRef<HTMLInputElement | null>(null)

  const normalizedRows: Norm[] = useMemo(() => {
    console.group('🔄 NORMALIZATION DEBUG - ENHANCED')
    console.log('Raw rows count:', rows.length)
    console.log('Current mapping:', mapping)
    console.log('Raw headers:', rawHeaders)
    
    if (rows.length > 0) {
      console.log('First 3 raw rows (complete):', rows.slice(0, 3))
      
      // Check what's actually in the mapping for each field
      REQUIRED_FIELDS.forEach(field => {
        const mappedColumn = mapping[field.key]
        console.log(`Field "${field.key}" maps to column "${mappedColumn}"`)
        if (rows.length > 0) {
          const sampleValue = rows[0][mappedColumn]
          console.log(`  Sample value from first row: "${sampleValue}" (type: ${typeof sampleValue})`)
        }
      })
    }
    
    const normalized = rows
      .map((r, index) => {
        const dateValue = r[mapping.date]
        const parsedDateString = toDate(dateValue)
        
        if (index < 3) { // Log first 3 for debugging
          console.log(`Normalizing row ${index}:`)
          console.log('  Raw row:', r)
          console.log('  Raw date value:', dateValue, typeof dateValue)
          console.log('  Parsed date string:', parsedDateString)
          console.log('  Campaign:', String(r[mapping.campaign] ?? '').trim() || '—')
          console.log('  Spend raw:', r[mapping.spend], 'parsed:', parseNumber(r[mapping.spend]))
        }
        
        return {
          date: parsedDateString,
          campaign: String(r[mapping.campaign] ?? '').trim() || '—',
          adset: String(r[mapping.adset] ?? '').trim() || '—',
          ad: String(r[mapping.ad] ?? '').trim() || '—',
          spend: parseNumber(r[mapping.spend]),
          impressions: parseNumber(r[mapping.impressions]),
          clicks: parseNumber(r[mapping.clicks]),
          conversions: parseNumber(r[mapping.conversions]),
          revenue: parseNumber(r[mapping.revenue]),
        }
      })
      .filter((r) => {
        const hasValidDate = r.date !== null
        if (!hasValidDate) {
          console.log('❌ Filtered out row with invalid date:', r)
        }
        return hasValidDate
      })
    
    console.log('Final normalized rows count:', normalized.length)
    console.log('First 3 normalized rows:', normalized.slice(0, 3))
    console.log('ALL NORMALIZED DATA:', normalized)
    console.groupEnd()
    
    return normalized
  }, [rows, mapping])

  const filteredRows = useMemo(() => {
    return normalizedRows.filter((r) => {
      // Only apply non-date filters by default
      const matchCampaign = filterCampaign === 'all' || r.campaign === filterCampaign
      const matchAdset = filterAdset === 'all' || r.adset === filterAdset
      const matchAd = filterAd === 'all' || r.ad === filterAd
      return matchCampaign && matchAdset && matchAd
    })
  }, [normalizedRows, filterCampaign, filterAdset, filterAd])

  // Console log filtered data whenever date filters change
  useEffect(() => {
    // Only log when fetch button is used, not on every filter change
    if (selectedDateData.length > 0 && showDateData) {
      console.group('📅 Currently Displayed Date-Filtered Data')
      console.log('Showing records:', selectedDateData.length)
      console.log('Date range applied:', { from: dateFrom || 'Any', to: dateTo || 'Any' })
      console.groupEnd()
    }
  }, [selectedDateData, showDateData, dateFrom, dateTo])

  const kpis = useMemo(() => {
    const spend = sum(filteredRows, 'spend')
    const imps = sum(filteredRows, 'impressions')
    const clicks = sum(filteredRows, 'clicks')
    const conv = sum(filteredRows, 'conversions')
    const rev = sum(filteredRows, 'revenue')
    const ctr = imps ? (clicks / imps) * 100 : 0
    const cpc = clicks ? spend / clicks : 0
    const cpm = imps ? (spend / imps) * 1000 : 0
    const roas = spend ? rev / spend : 0
    const cpa = conv ? spend / conv : 0
    return { spend, imps, clicks, conv, rev, ctr, cpc, cpm, roas, cpa }
  }, [filteredRows])

  const dimensionValues = useMemo(() => {
    const unique = (key: keyof Norm) => Array.from(new Set(normalizedRows.map((r) => r[key]).filter(Boolean))) as string[]
    return {
      campaigns: ['all', ...unique('campaign')],
      adsets: ['all', ...unique('adset')],
      ads: ['all', ...unique('ad')],
    }
  }, [normalizedRows])

  const grouped = useMemo(() => {
    const m = new Map<string, Norm[]>()
    for (const r of filteredRows) {
      const k = (r as any)[groupBy] || '—'
      if (!m.has(k)) m.set(k, [])
      m.get(k)!.push(r)
    }
    const rows = Array.from(m.entries()).map(([key, items]) => {
      const spend = sum(items, 'spend')
      const imps = sum(items, 'impressions')
      const clicks = sum(items, 'clicks')
      const conv = sum(items, 'conversions')
      const rev = sum(items, 'revenue')
      const ctr = imps ? (clicks / imps) * 100 : 0
      const cpc = clicks ? spend / clicks : 0
      const cpm = imps ? (spend / imps) * 1000 : 0
      const roas = spend ? rev / spend : 0
      const cpa = conv ? spend / conv : 0
      return { key, spend, imps, clicks, conv, rev, ctr, cpc, cpm, roas, cpa }
    })
    rows.sort((a, b) => b.spend - a.spend)
    return rows
  }, [filteredRows, groupBy])

  const timeseries = useMemo(() => {
    const m = new Map<string, Norm[]>()
    for (const r of filteredRows) {
      const k = r.date!
      if (!m.has(k)) m.set(k, [])
      m.get(k)!.push(r)
    }
    return Array.from(m.entries())
      .map(([date, items]) => ({
        date,
        spend: sum(items, 'spend'),
        revenue: sum(items, 'revenue'),
        conversions: sum(items, 'conversions'),
        clicks: sum(items, 'clicks'),
        impressions: sum(items, 'impressions'),
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
  }, [filteredRows])

  // Function to fetch and display selected date data
  const fetchSelectedDateData = () => {
    // Apply date filtering only when this function is called
    const dateFilteredData = normalizedRows.filter((r) => {
      const after = !dateFrom || (r.date! >= dateFrom)
      const before = !dateTo || (r.date! <= dateTo)
      const matchCampaign = filterCampaign === 'all' || r.campaign === filterCampaign
      const matchAdset = filterAdset === 'all' || r.adset === filterAdset
      const matchAd = filterAd === 'all' || r.ad === filterAd
      return after && before && matchCampaign && matchAdset && matchAd
    })
    
    setSelectedDateData(dateFilteredData)
    setShowDateData(true)
    
    console.group('🔍 FETCH SELECTED DATE DATA')
    console.log('Date Range:', { from: dateFrom || 'Any', to: dateTo || 'Any' })
    console.log('Total Records Found:', dateFilteredData.length)
    console.log('Date Summary:', dateFilteredData.reduce((acc, row) => {
      acc[row.date!] = (acc[row.date!] || 0) + 1
      return acc
    }, {} as Record<string, number>))
    console.log('Detailed Data:', dateFilteredData)
    
    // Debug info for date filtering
    if (dateFilteredData.length === 0 && normalizedRows.length > 0) {
      console.log('🚨 No records found! Debug info:')
      console.log('Available dates:', Array.from(new Set(normalizedRows.map(r => r.date))).sort())
      console.log('Date filter test on first 3 rows:')
      normalizedRows.slice(0, 3).forEach((row, i) => {
        const after = !dateFrom || (row.date! >= dateFrom)
        const before = !dateTo || (row.date! <= dateTo)
        console.log(`Row ${i}: ${row.date} - after:${after}, before:${before}`)
      })
    }
    console.groupEnd()
  }

  function handleFiles(files: FileList | null) {
    if (!files || !files.length) return
    const file = files[0]
    
    console.group('📁 ENHANCED FILE UPLOAD DEBUG')
    console.log('File name:', file.name)
    console.log('File type:', file.type)
    console.log('File size:', file.size, 'bytes')
    
    setUploadFileName(file.name)
    setIsUploading(true)
    setUploadPct(0)

    const reader = new FileReader()
    reader.onprogress = (e) => {
      if (e.lengthComputable) setUploadPct(Math.round((e.loaded / e.total) * 100))
    }
    reader.onload = () => {
      try {
        console.log('📄 File read successfully, starting CSV parsing...')
        const fileContent = reader.result as string
        console.log('File content (first 1000 chars):', fileContent.substring(0, 1000))
        console.log('File content (complete):', fileContent)
        
        Papa.parse(fileContent, {
          header: true,
          skipEmptyLines: true,
          dynamicTyping: false, // Keep everything as strings initially
          complete: (results) => {
            console.log('🎯 ENHANCED CSV Parse Results:')
            console.log('Meta info:', results.meta)
            console.log('Headers found:', results.meta.fields)
            console.log('Total rows parsed:', results.data.length)
            console.log('Parse errors:', results.errors)
            console.log('COMPLETE parsed data:', results.data)
            console.log('First 5 parsed rows:', results.data.slice(0, 5))
            
            if (results.errors.length > 0) {
              console.warn('CSV parsing errors:', results.errors)
            }
            
            const headers = (results.meta.fields || []) as string[]
            console.log('Setting raw headers to:', headers)
            setRawHeaders(headers)
            
            const parsed = (results.data as any[]).map((r, index) => {
              console.log(`Processing row ${index}:`, r)
              return { ...r }
            })
            
            console.log('Final parsed data being set to state:', parsed)
            console.log('Number of rows being set:', parsed.length)
            
            setRows(parsed)
            
            // Automatically set up column mapping if headers match expected names
          type FieldKey = typeof REQUIRED_FIELDS[number]['key'];

const autoMapping: Record<FieldKey, string> = {} as Record<FieldKey, string>;

REQUIRED_FIELDS.forEach(field => {
  const exactMatch = headers.find(h => h.toLowerCase() === field.key.toLowerCase());
  const partialMatch = headers.find(h => h.toLowerCase().includes(field.key.toLowerCase()));
  autoMapping[field.key] = exactMatch || partialMatch || field.key;
});

            console.log('Auto-detected column mapping:', autoMapping)
            setMapping(autoMapping)
            
            setUploadPct(100)
            setTimeout(() => {
              setIsUploading(false)
              console.log('✅ Upload completed successfully')
              console.groupEnd()
            }, 300)
          },
          error: (err:Error) => {
            console.error('❌ CSV Parse Error-', err)
            alert('Parse error: ' + (err?.message || ''))
            setIsUploading(false)
            console.groupEnd()
          },
        })
      } catch (err) {
        console.error('❌ File read error:', err)
        alert('Failed to read file')
        setIsUploading(false)
        console.groupEnd()
      }
    }
    reader.onerror = () => {
      console.error('❌ FileReader error')
      alert('Could not read file')
      setIsUploading(false)
      console.groupEnd()
    }
    reader.readAsText(file)
  }

  function downloadCsv(data: any[], filename: string) {
    const csv = Papa.unparse(data)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  function exportState() {
    const data = { rows, mapping, dateFrom, dateTo }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'meta_dashboard_state.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  function importState(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string)
        setRows(data.rows || [])
        setMapping(data.mapping || mapping)
        setDateFrom(data.dateFrom || '')
        setDateTo(data.dateTo || '')
        setUploadFileName(f.name || 'Imported state')
      } catch (err) {
        alert('Invalid JSON state file')
      }
    }
    reader.readAsText(f)
  }

  function resetAll() {
    setRows([])
    setMapping(Object.fromEntries(REQUIRED_FIELDS.map(f => [f.key, f.key])))
    setRawHeaders([])
    setDateFrom('')
    setDateTo('')
    setFilterCampaign('all')
    setFilterAdset('all')
    setFilterAd('all')
    setUploadFileName('')
    setSelectedDateData([])
    setShowDateData(false)
  }

  useEffect(() => {
    if (!normalizedRows.length) return
    setIsComputing(true)
    setComputePct(0)
    const interval = setInterval(() => setComputePct((p) => Math.min(p + 12, 90)), 80)
    const done = () => {
      clearInterval(interval)
      setComputePct(100)
      setTimeout(() => setIsComputing(false), 150)
    }
    const timeout = setTimeout(done, 450)
    return () => { clearInterval(interval); clearTimeout(timeout) }
  }, [dateFrom, dateTo, filterCampaign, filterAdset, filterAd, groupBy, view, rows, mapping])

  useEffect(() => {
    setIsKpiLoading(true)
    setKpiPct(0)
    let pct = 0
    const iv = setInterval(() => { pct = Math.min(pct + 8, 95); setKpiPct(Math.round(pct)) }, 90)
    const end = () => { clearInterval(iv); setKpiPct(100); setTimeout(() => setIsKpiLoading(false), 160) }
    const to = setTimeout(end, 1200)
    return () => { clearInterval(iv); clearTimeout(to) }
  }, [dateFrom, dateTo, filterCampaign, filterAdset, filterAd, groupBy, view, mapping, rows])

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-slate-50 to-white text-slate-900">
      {/* Header */}
      <div className="sticky top-0 z-40 backdrop-blur bg-white/70 border-b">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-2xl bg-slate-900 text-white grid place-items-center shadow-md">MA</div>
            <div>
              <h1 className="text-xl font-semibold leading-tight">Meta Ads Dashboard</h1>
              <p className="text-xs text-slate-500 -mt-0.5">Upload • Explore • Share</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {uploadFileName && <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs max-w-[240px] truncate" title={uploadFileName}>{uploadFileName}</span>}
            {/* <button className="px-3 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50" onClick={exportState}>
              <Share2 size={16} className="inline mr-1"/> Export State
            </button>
            <label className="px-3 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50 cursor-pointer">
              <input type="file" accept="application/json" className="hidden" onChange={importState} />
              <span className="inline-flex items-center gap-1"><Share2 size={16}/> Import State</span>
            </label> */}
            <button className="px-3 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700" onClick={resetAll}>
              <RefreshCcw size={16} className="inline mr-1"/> Reset
            </button>
          </div>
        </div>
        {isComputing && (
          <div className="h-1 bg-slate-200">
            <div className="h-1 bg-sky-500 transition-all" style={{ width: `${computePct}%` }} />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Debug Info Panel */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-semibold text-yellow-800 mb-2">🐛 Debug Information</h3>
          <div className="text-sm text-yellow-700 space-y-1">
            <div>Raw CSV rows loaded: <strong>{rows.length}</strong></div>
            <div>Successfully normalized: <strong>{normalizedRows.length}</strong></div>
            <div>Currently filtered/displayed: <strong>{filteredRows.length}</strong></div>
            <div>Raw headers detected: <strong>{rawHeaders.join(', ')}</strong></div>
            <div>Upload filename: <strong>{uploadFileName || 'None'}</strong></div>
          </div>
          
          {rows.length > 0 && (
            <div className="mt-3 text-xs text-yellow-600 bg-yellow-100 p-2 rounded max-h-32 overflow-y-auto">
              <strong>First raw row:</strong> {JSON.stringify(rows[0], null, 2)}
            </div>
          )}
          
          {normalizedRows.length > 0 && (
            <div className="mt-2 text-xs text-yellow-600 bg-yellow-100 p-2 rounded max-h-32 overflow-y-auto">
              <strong>First normalized row:</strong> {JSON.stringify(normalizedRows[0], null, 2)}
            </div>
          )}
        </div>

        {/* Upload */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-6">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-6">
            <div className="flex-1">
              <h2 className="text-lg font-semibold">Upload your Meta Ads report</h2>
              <p className="text-sm text-slate-500">CSV with columns: Date, Campaign, Ad Set, Ad, Spend, Impressions, Clicks, Conversions, Revenue. You can remap columns after upload.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {REQUIRED_FIELDS.map((f) => (<span key={f.key} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">{f.label}</span>))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={(e) => handleFiles(e.target.files)} />
              <button className="px-3 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700" onClick={() => fileRef.current?.click()}>
                <Upload size={16} className="inline mr-1"/> Upload CSV File
              </button>
              {/* {uploadFileName && <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs max-w-[220px] truncate" title={uploadFileName}>{uploadFileName}</span>} */}
              {/* <button className="px-3 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50" onClick={() => {
                console.log('📝 Loading sample data...')
                Papa.parse(sampleCsv, { header: true, complete: (res) => { 
                  console.log('Sample data parsed:', res.data)
                  console.log('Sample headers:', res.meta.fields)
                  setRows(res.data as any[])
                  setRawHeaders((res.meta.fields||[]) as string[])
                  setUploadFileName('Sample dataset')
                } })
              }}>
                <Database size={16} className="inline mr-1"/> Load Sample
              </button> */}
            </div>
          </div>
          {isUploading && (
            <div className="mt-4"><ProgressBar percent={uploadPct} label={`Uploading ${uploadPct}%`} /></div>
          )}

          {/* Column mapping */}
          {rows.length > 0 && (
            <div className="mt-4">
              <button className="px-3 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50" onClick={() => setShowMapping(s => !s)}>
                {showMapping ? 'Close' : 'Map columns'}
              </button>
              {showMapping && (
                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                  {REQUIRED_FIELDS.map((f) => (
                    <div key={f.key} className="space-y-2">
                      <label className="text-xs text-slate-500">{f.label}</label>
                      <select className="w-full p-2 border border-gray-300 rounded-md text-sm" value={mapping[f.key]} onChange={(e) => setMapping(m => ({...m, [f.key]: e.target.value}))}>
                        {rawHeaders.map((h) => (<option key={h} value={h}>{h}</option>))}
                      </select>
                    </div>
                  ))}
                  <div className="col-span-full text-xs text-slate-500">Tip: map columns like "Amount Spent (INR)" to <b>Spend</b>. Values are normalized automatically.</div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Filters with Fetch Button */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-6">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
            <div>
              <label className="text-sm font-medium text-gray-700">Date from</label>
              <input type="date" className="w-full p-2 border border-gray-300 rounded-md text-sm" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Date to</label>
              <input type="date" className="w-full p-2 border border-gray-300 rounded-md text-sm" value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Campaign</label>
              <select className="w-full p-2 border border-gray-300 rounded-md text-sm" value={filterCampaign} onChange={e => setFilterCampaign(e.target.value)}>
                {dimensionValues.campaigns.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Ad Set</label>
              <select className="w-full p-2 border border-gray-300 rounded-md text-sm" value={filterAdset} onChange={e => setFilterAdset(e.target.value)}>
                {dimensionValues.adsets.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Ad</label>
              <select className="w-full p-2 border border-gray-300 rounded-md text-sm" value={filterAd} onChange={e => setFilterAd(e.target.value)}>
                {dimensionValues.ads.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <button 
                className="w-full px-3 py-2 bg-green-600 text-white rounded-md text-sm hover:bg-green-700 flex items-center justify-center gap-2"
                onClick={fetchSelectedDateData}
                disabled={!normalizedRows.length}
              >
                <Search size={16}/>
                Fetch Data
              </button>
            </div>
          </div>
          
          {/* Date Range Summary with Debug Info */}
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-blue-800 mb-2">
              <Calendar size={16}/>
              <span>
                Ready to fetch range: {dateFrom || 'Any'} to {dateTo || 'Any'} 
              </span>
              <span className="px-2 py-1 bg-blue-200 rounded text-xs">
                Currently showing ALL {filteredRows.length} records
              </span>
            </div>
            
            {/* Enhanced Debug Info */}
            {normalizedRows.length > 0 && (
              <div className="text-xs text-blue-600 space-y-1 bg-blue-100 p-2 rounded">
                <div><strong>Data Overview:</strong></div>
                <div>Total rows uploaded: {rows.length}</div>
                <div>Successfully normalized: {normalizedRows.length}</div>
                <div>Currently displayed (all data): {filteredRows.length}</div>
                
                <div className="mt-2">
                  <strong>Available dates in your data:</strong>
                  <div className="ml-2 max-h-16 overflow-y-auto text-xs">
                    {Array.from(new Set(normalizedRows.map(r => r.date).filter(Boolean)))
                      .sort()
                      .join(', ')}
                  </div>
                </div>
                
                <div className="mt-2 text-orange-600">
                  <strong>Note:</strong> Set date range above and click "Fetch Data" to apply date filtering
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Selected Date Data Display */}
        {showDateData && selectedDateData.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-green-200 p-4 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Search className="text-green-600" size={20}/>
                <h3 className="font-semibold text-green-800">Fetched Date Data</h3>
                <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm">
                  {selectedDateData.length} records
                </span>
              </div>
              <button 
                className="px-3 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
                onClick={() => setShowDateData(false)}
              >
                Close
              </button>
            </div>
            
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="text-sm text-green-600 font-medium">Total Spend</div>
                <div className="text-xl font-bold text-green-800">₹{sum(selectedDateData, 'spend').toFixed(0)}</div>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="text-sm text-blue-600 font-medium">Total Revenue</div>
                <div className="text-xl font-bold text-blue-800">₹{sum(selectedDateData, 'revenue').toFixed(0)}</div>
              </div>
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                <div className="text-sm text-purple-600 font-medium">Total Clicks</div>
                <div className="text-xl font-bold text-purple-800">{sum(selectedDateData, 'clicks')}</div>
              </div>
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                <div className="text-sm text-orange-600 font-medium">Total Conversions</div>
                <div className="text-xl font-bold text-orange-800">{sum(selectedDateData, 'conversions')}</div>
              </div>
            </div>

            {/* Data Table */}
            <div className="overflow-x-auto rounded-lg border border-green-200">
              <table className="w-full text-sm">
                <thead className="bg-green-50 text-green-700">
                  <tr>
                    <th className="text-left p-3 font-medium">Date</th>
                    <th className="text-left p-3 font-medium">Campaign</th>
                    <th className="text-left p-3 font-medium">Ad Set</th>
                    <th className="text-left p-3 font-medium">Ad</th>
                    <th className="text-right p-3 font-medium">Spend</th>
                    <th className="text-right p-3 font-medium">Revenue</th>
                    <th className="text-right p-3 font-medium">Clicks</th>
                    <th className="text-right p-3 font-medium">Conv.</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedDateData.slice(0, 20).map((row, i) => (
                    <tr key={i} className="hover:bg-green-50 border-b border-green-100">
                      <td className="p-3">{row.date}</td>
                      <td className="p-3">{row.campaign}</td>
                      <td className="p-3">{row.adset}</td>
                      <td className="p-3">{row.ad}</td>
                      <td className="p-3 text-right">₹{row.spend.toFixed(2)}</td>
                      <td className="p-3 text-right">₹{row.revenue.toFixed(2)}</td>
                      <td className="p-3 text-right">{row.clicks}</td>
                      <td className="p-3 text-right">{row.conversions}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {selectedDateData.length > 20 && (
                <div className="p-3 text-center text-sm text-gray-500 bg-green-50">
                  Showing first 20 of {selectedDateData.length} records
                </div>
              )}
            </div>
          </div>
        )}

        {/* KPI Cards with loading overlay */}
        <div className="relative">
          {isKpiLoading && (
            <div className="absolute inset-0 rounded-xl bg-white/60 backdrop-blur-[1px] pointer-events-none flex flex-col gap-2 p-2">
              <ProgressBar percent={kpiPct} label={`Updating cards ${kpiPct}%`} />
            </div>
          )}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <KpiCard title="Spend" value={`₹${niceNumber(kpis.spend, 0)}`} hint="Total spend" />
            <KpiCard title="Revenue" value={`₹${niceNumber(kpis.rev, 0)}`} hint="Total revenue" />
            <KpiCard title="ROAS" value={kpis.roas.toFixed(2)} hint="Revenue / Spend" />
            <KpiCard title="CTR" value={`${kpis.ctr.toFixed(2)}%`} hint="Clicks / Impressions" />
            <KpiCard title="CPC" value={`₹${kpis.cpc.toFixed(2)}`} hint="Spend / Clicks" />
            <KpiCard title="CPM" value={`₹${kpis.cpm.toFixed(2)}`} hint="Spend per 1000 impressions" />
            <KpiCard title="Clicks" value={niceNumber(kpis.clicks)} hint="Total clicks" />
            <KpiCard title="Impressions" value={niceNumber(kpis.imps)} hint="Total impressions" />
            <KpiCard title="Conversions" value={niceNumber(kpis.conv)} hint="Total conversions" />
            <KpiCard title="CPA" value={`₹${kpis.cpa.toFixed(2)}`} hint="Spend / Conversions" />
          </div>
        </div>

        {/* Visuals */}
        <div className="grid grid-cols-1 gap-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-6">
            <h3 className="font-semibold mb-4">Performance over time</h3>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={timeseries} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <RTooltip formatter={(v: any) => String(v)} />
                  <Legend />
                  <Area type="monotone" dataKey="spend" fill="#8884d8" name="Spend" />
                  <Area type="monotone" dataKey="revenue" fill="#82ca9d" name="Revenue" />
                  <Line type="monotone" dataKey="conversions" stroke="#ffc658" name="Conversions" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-6">
              <h3 className="font-semibold mb-4">Top {groupBy} by Spend</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={grouped.slice(0, 10)} layout="vertical" margin={{ left: 40, right: 16, top: 8, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="key" type="category" width={140} />
                    <RTooltip />
                    <Legend />
                    <Bar dataKey="spend" fill="#8884d8" name="Spend" />
                    <Bar dataKey="revenue" fill="#82ca9d" name="Revenue" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-6">
              <h3 className="font-semibold mb-4">Efficiency over time</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={timeseries.map(d => ({...d, cpa: d.conversions ? d.spend/d.conversions : 0, roas: d.spend ? d.revenue/d.spend : 0}))} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <RTooltip />
                    <Legend />
                    <Line type="monotone" dataKey="cpa" stroke="#8884d8" name="CPA" dot={false} />
                    <Line type="monotone" dataKey="roas" stroke="#82ca9d" name="ROAS" dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Raw data</h3>
            <div className="flex items-center gap-2">
              <button className="px-3 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50" onClick={() => downloadCsv(filteredRows, 'filtered_meta_data.csv')}>
                <Download size={16} className="inline mr-1"/> Download CSV
              </button>
            </div>
          </div>
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-left p-3">Date</th>
                  <th className="text-left p-3">Campaign</th>
                  <th className="text-left p-3">Ad Set</th>
                  <th className="text-left p-3">Ad</th>
                  <th className="text-right p-3">Spend</th>
                  <th className="text-right p-3">Impr.</th>
                  <th className="text-right p-3">Clicks</th>
                  <th className="text-right p-3">Conv.</th>
                  <th className="text-right p-3">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((r, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="p-3">{r.date}</td>
                    <td className="p-3">{r.campaign}</td>
                    <td className="p-3">{r.adset}</td>
                    <td className="p-3">{r.ad}</td>
                    <td className="p-3 text-right">₹{r.spend.toFixed(2)}</td>
                    <td className="p-3 text-right">{r.impressions}</td>
                    <td className="p-3 text-right">{r.clicks}</td>
                    <td className="p-3 text-right">{r.conversions}</td>
                    <td className="p-3 text-right">₹{r.revenue.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}