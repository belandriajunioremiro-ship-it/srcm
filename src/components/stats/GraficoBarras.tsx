import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'

interface Props {
  data: { name: string; predios: number; superficie: number }[]
}

export default function GraficoBarras({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="#475569" />
        <YAxis tick={{ fontSize: 10 }} stroke="#475569" />
        <Tooltip
          contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '12px' }}
        />
        <Legend wrapperStyle={{ fontSize: '12px' }} />
        <Bar dataKey="predios" fill="#1E3A8A" radius={[4, 4, 0, 0]} name="N° Predios" />
        <Bar dataKey="superficie" fill="#8C7B68" radius={[4, 4, 0, 0]} name="Superficie (m²)" />
      </BarChart>
    </ResponsiveContainer>
  )
}
