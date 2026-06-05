import { useEffect, useState } from 'react'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { fetchStatsByType, fetchStatsByState } from '../../services/api'
import { getDamageLabel } from '../../utils/severity'

const PIE_COLORS = ['#f97f09','#3b82f6','#22c55e','#ef4444','#a855f7','#06b6d4']

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-road-card border border-road-border rounded-lg px-3 py-2 text-xs font-mono shadow-xl">
      <p className="text-white font-semibold">{payload[0].name}</p>
      <p className="text-road-muted">{payload[0].value} reports</p>
    </div>
  )
}

export default function DamageTypeChart() {
  const [typeData, setTypeData] = useState([])
  const [stateData, setStateData] = useState([])

  useEffect(() => {
    fetchStatsByType().then(raw => {
      setTypeData((raw || []).map(d => ({
        name: getDamageLabel(d.damage_type || d.name),
        value: d.count || d.value || 0,
      })))
    }).catch(() => {})

    fetchStatsByState().then(raw => {
      const sorted = (raw || [])
        .map(d => ({ name: d.state?.split(' ')[0] || d.name, value: d.count || d.value || 0 }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10)
      setStateData(sorted)
    }).catch(() => {})
  }, [])

  return (
    <div className="grid md:grid-cols-2 gap-4">
      {/* Pie chart */}
      <div className="card">
        <p className="text-xs font-mono text-road-muted uppercase tracking-widest mb-4">By Damage Type</p>
        {typeData.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={typeData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={3}
                dataKey="value"
              >
                {typeData.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend
                formatter={(value) => (
                  <span style={{ color: '#8b949e', fontSize: '10px', fontFamily: 'DM Mono' }}>{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[220px] flex items-center justify-center text-road-muted text-xs font-mono">
            No data yet
          </div>
        )}
      </div>

      {/* Bar chart by state */}
      <div className="card">
        <p className="text-xs font-mono text-road-muted uppercase tracking-widest mb-4">Top States by Reports</p>
        {stateData.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stateData} layout="vertical" margin={{ left: 0, right: 16 }}>
              <XAxis type="number" tick={{ fill: '#8b949e', fontSize: 9, fontFamily: 'DM Mono' }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fill: '#8b949e', fontSize: 9, fontFamily: 'DM Mono' }} axisLine={false} tickLine={false} width={70} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" fill="#f97f09" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[220px] flex items-center justify-center text-road-muted text-xs font-mono">
            No data yet
          </div>
        )}
      </div>
    </div>
  )
}
