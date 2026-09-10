import React, { useEffect, useState } from 'react'
import { Save, Calculator, AlertTriangle, Info } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNotifications } from 'reapop'
import { api } from '@/lib/api'
import Input from '@/components/ui/Input'

const schema = z.object({
  valor_m2_terreno: z.number().min(0.1, 'Debe ser mayor a 0'),
  valor_m2_construccion: z.number().min(0.1, 'Debe ser mayor a 0'),
  alicuota_impuesto: z.number().min(0.0001, 'Debe ser mayor a 0').max(1, 'No puede exceder 1 (100%)'),
})

type FormData = z.infer<typeof schema>

export default function AvaluosConfig() {
  const { notify } = useNotifications()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      valor_m2_terreno: 24500.00,
      valor_m2_construccion: 85400.00,
      alicuota_impuesto: 0.003
    }
  })

  useEffect(() => {
    async function loadData() {
      try {
        const data = await api.getParametros()
        if (data) {
          reset({
            valor_m2_terreno: Number(data.valor_m2_terreno),
            valor_m2_construccion: Number(data.valor_m2_construccion),
            alicuota_impuesto: Number(data.alicuota_impuesto)
          })
        }
      } catch (err: any) {
        notify('Error al cargar la planta de valores: ' + err.message, 'error')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [reset, notify])

  const onSubmit = async (data: FormData) => {
    setSaving(true)
    try {
      await api.saveParametros({
        valor_m2_terreno: data.valor_m2_terreno,
        valor_m2_construccion: data.valor_m2_construccion,
        alicuota_impuesto: data.alicuota_impuesto,
      })
      notify('Planta de valores actualizada. Los próximos cálculos usarán estas tasas.', 'success')
    } catch (err: any) {
      notify('Error al guardar: ' + err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="p-6">Cargando planta de valores...</div>
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-institutional-gold/20 flex items-center justify-center text-institutional-gold">
          <Calculator className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-text-main">Planta de Valores y Avalúo</h1>
          <p className="text-sm text-institutional-slate">Configura los parámetros financieros para el cálculo automático del avalúo catastral y el derecho de frente.</p>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6 flex gap-3">
        <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800 space-y-1">
          <p><strong>Impacto de estos cambios:</strong> Al guardar, estos valores se utilizarán para calcular dinámicamente el valor catastral en las nuevas Cédulas Catastrales.</p>
          <p>La fórmula aplicada será: <code>(Área Terreno × Valor Terreno) + (Área Construcción × Valor Construcción)</code></p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-5 md:p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <div className="space-y-4">
              <h2 className="text-sm font-bold text-institutional-navy border-b border-gray-100 pb-2 uppercase tracking-wide">
                Valores Base (Bs. por m²)
              </h2>
              <div>
                <Input 
                  label="Valor Metro Cuadrado (Terreno)" 
                  type="number" 
                  step="0.01" 
                  icon={<span className="font-bold text-gray-400">Bs</span>}
                  placeholder="24500.00"
                  {...register('valor_m2_terreno', { valueAsNumber: true })} 
                />
                {errors.valor_m2_terreno && <p className="text-red-500 text-xs mt-1">{errors.valor_m2_terreno.message}</p>}
              </div>
              <div>
                <Input 
                  label="Valor Metro Cuadrado (Construcción)" 
                  type="number" 
                  step="0.01" 
                  icon={<span className="font-bold text-gray-400">Bs</span>}
                  placeholder="85400.00"
                  {...register('valor_m2_construccion', { valueAsNumber: true })} 
                />
                {errors.valor_m2_construccion && <p className="text-red-500 text-xs mt-1">{errors.valor_m2_construccion.message}</p>}
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="text-sm font-bold text-institutional-navy border-b border-gray-100 pb-2 uppercase tracking-wide">
                Tasas Impositivas
              </h2>
              <div>
                <Input 
                  label="Alícuota Municipal (Decimal)" 
                  type="number" 
                  step="0.0001" 
                  icon={<span className="font-bold text-gray-400">%</span>}
                  placeholder="0.003"
                  {...register('alicuota_impuesto', { valueAsNumber: true })} 
                />
                <p className="text-[11px] text-gray-500 mt-1">
                  Ejemplo: Para el 3 por mil (0.3%), ingrese <strong>0.003</strong>.
                </p>
                {errors.alicuota_impuesto && <p className="text-red-500 text-xs mt-1">{errors.alicuota_impuesto.message}</p>}
              </div>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-yellow-800">
                  Modificar la alícuota alterará inmediatamente el cálculo de la Base Imponible Anual en las cédulas catastrales emitidas a partir de hoy.
                </p>
              </div>
            </div>

          </div>
        </div>

        <div className="bg-background-light p-4 md:px-6 border-t border-gray-100 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="bg-institutional-gold hover:bg-yellow-600 text-white px-6 py-2.5 rounded-lg font-bold flex items-center gap-2 transition disabled:opacity-50"
          >
            {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Guardando...' : 'Guardar Planta de Valores'}
          </button>
        </div>
      </form>
    </div>
  )
}
