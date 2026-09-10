import { useEffect, useState } from 'react'
import { Map, Ruler, Building2, Layers, PieChart as PieIcon } from 'lucide-react'
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
} from 'recharts'
import Tarjeta from '@/components/stats/Tarjeta'
import GraficoBarras from '@/components/stats/GraficoBarras'
import { api } from '@/lib/api'
import type { Inmueble } from '@/types'

const tipoColores: Record<string, string> = {
  residencial: '#1E3A8A', // Institutional navy
  comercial: '#8C7B68',   // Institutional gold
  industrial: '#475569',  // Institutional slate
  rural: '#166534',       // Dark green
  mixto: '#7c3aed',       // Serious purple
}

export default function Estadisticas() {
  const [stats, setStats] = useState<any>(null)
  const [barriosRanking, setBarriosRanking] = useState<any[]>([])

  useEffect(() => {
    (async () => {
      try {
        const dataStats = await api.getEstadisticas()
        const dataBarrios = await api.getPrediosPorBarrio()
        setStats(dataStats)
        setBarriosRanking(dataBarrios)
      } catch (err) {
        console.error(err)
      }
    })()
  }, [])

  if (!stats) return <div className="p-6 text-institutional-slate animate-pulse">Cargando estadísticas...</div>

  const totalPredios = stats.total_predios || 0
  const superficieTotal = stats.superficie_total_m2 || 0
  const porTipoMap = stats.por_tipo || {}
  const porZonaMap = stats.por_zona || {}

  const pieData = Object.entries(porTipoMap).map(([name, value]) => ({ name, value, color: tipoColores[name] || '#ccc' }))

  const barData = barriosRanking.map((b: any) => ({
    name: b.barrio,
    predios: b.predios,
    superficie: Math.round(b.superficie_m2),
  }))

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <h1 className="text-lg md:text-xl font-bold text-text-main mb-1">Estadísticas Catastrales</h1>
      <p className="text-sm text-institutional-slate mb-6">Resumen general del Sistema de Registro Catastral Municipal</p>

      {/* Tarjetas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
        <Tarjeta icon={<Map className="w-5 md:w-6 h-5 md:h-6" />} label="Total Predios" value={totalPredios} accent="text-institutional-navy" />
        <Tarjeta icon={<Ruler className="w-5 md:w-6 h-5 md:h-6" />} label="Superficie Total" value={`${(superficieTotal / 1000).toFixed(1)}K m²`} accent="text-institutional-gold" />
        <Tarjeta icon={<Building2 className="w-5 md:w-6 h-5 md:h-6" />} label="Zonas" value={Object.keys(porZonaMap).length} accent="text-institutional-slate" />
        <Tarjeta icon={<Layers className="w-5 md:w-6 h-5 md:h-6" />} label="Barrios" value={barriosRanking.length} accent="text-text-main" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Pie por tipo */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-5">
          <div className="flex items-center gap-2 mb-4">
            <PieIcon className="w-4 h-4 text-institutional-navy" />
            <h2 className="text-sm font-semibold text-text-charcoal">Distribución por Tipo</h2>
          </div>
          <ResponsiveContainer width="100%" height={250} className="md:h-[280px]">
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                {pieData.map((entry: any) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '12px' }} />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Barras por barrio */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-5">
          <div className="flex items-center gap-2 mb-4">
            <Layers className="w-4 h-4 text-institutional-navy" />
            <h2 className="text-sm font-semibold text-text-charcoal">Predios por Barrio</h2>
          </div>
          <div className="h-[250px] md:h-[280px]">
            <GraficoBarras data={barData} />
          </div>
        </div>
      </div>

      {/* Tabla resumen por zona */}
      <div className="mt-4 md:mt-6 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-4 md:px-5 py-3 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-text-charcoal">Resumen por Zona</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[300px]">
            <thead className="bg-background-light">
              <tr>
                <th className="text-left px-4 md:px-5 py-2.5 font-medium text-institutional-slate">Zona</th>
                <th className="text-right px-4 md:px-5 py-2.5 font-medium text-institutional-slate">N° Predios</th>
                <th className="text-right px-4 md:px-5 py-2.5 font-medium text-institutional-slate">% del Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {Object.entries(porZonaMap).map(([zona, count]: any) => (
                <tr key={zona} className="hover:bg-background-lighter transition-colors">
                  <td className="px-4 md:px-5 py-2.5 text-text-main font-medium">{zona}</td>
                  <td className="px-4 md:px-5 py-2.5 text-right text-text-charcoal">{count}</td>
                  <td className="px-4 md:px-5 py-2.5 text-right text-institutional-slate">{((count / totalPredios) * 100).toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
