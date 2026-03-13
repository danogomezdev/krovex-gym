import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)       // Supabase auth user (admin/entrenador)
  const [staffUser, setStaffUser] = useState(null)  // Staff profile from DB
  const [member, setMember] = useState(null)   // Member logged via DNI+PIN
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check Supabase auth session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user)
        loadStaffProfile(session.user.id)
      } else {
        // Check for member session in localStorage
        const savedMember = localStorage.getItem('krovex_member')
        if (savedMember) {
          try {
            setMember(JSON.parse(savedMember))
          } catch { localStorage.removeItem('krovex_member') }
        }
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user)
        loadStaffProfile(session.user.id)
        setMember(null)
        localStorage.removeItem('krovex_member')
      } else {
        setUser(null)
        setStaffUser(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const loadStaffProfile = async (authId) => {
    try {
      const { data, error } = await supabase
        .from('staff_users')
        .select('*')
        .eq('auth_id', authId)
        .single()

      if (error || !data) {
        // If no staff profile, create a default one for demo
        const { data: userData } = await supabase.auth.getUser()
        if (userData?.user) {
          setStaffUser({
            id: 'demo',
            nombre: 'Admin',
            apellido: 'Demo',
            email: userData.user.email,
            rol: 'super_admin',
            auth_id: authId
          })
        }
      } else {
        setStaffUser(data)
      }
    } catch (err) {
      console.error('Error loading staff profile:', err)
    } finally {
      setLoading(false)
    }
  }

  // Admin/Trainer login via Supabase Auth
  const signIn = async (email, password) => {
    setLoading(true)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)

    if (error) {
      if (error.message.includes('Invalid login')) {
        toast.error('Email o contraseña incorrectos')
      } else {
        toast.error(error.message)
      }
      return { success: false, error }
    }

    toast.success('¡Bienvenido!')
    return { success: true, data }
  }

  // Member login via DNI + PIN (custom RPC)
  const memberSignIn = async (dni, pin) => {
    setLoading(true)
    try {
      const { data, error } = await supabase.rpc('member_login', {
        p_dni: dni,
        p_pin: pin
      })

      setLoading(false)

      if (error) {
        toast.error('Error de conexión')
        return { success: false }
      }

      if (!data?.success) {
        toast.error(data?.error || 'DNI o PIN incorrectos')
        return { success: false }
      }

      const memberData = {
        ...data.member,
        membership: data.membership,
        plan: data.plan
      }

      setMember(memberData)
      localStorage.setItem('krovex_member', JSON.stringify(memberData))
      toast.success(`¡Hola, ${data.member.nombre}!`)
      return { success: true, member: memberData }
    } catch (err) {
      setLoading(false)
      toast.error('Error al iniciar sesión')
      return { success: false }
    }
  }

  const signOut = async () => {
    if (member) {
      setMember(null)
      localStorage.removeItem('krovex_member')
      toast.success('Sesión cerrada')
      return
    }

    await supabase.auth.signOut()
    setUser(null)
    setStaffUser(null)
    toast.success('Sesión cerrada')
  }

  const refreshMember = async () => {
    if (!member?.id) return
    const { data } = await supabase.rpc('get_member_dashboard', { p_member_id: member.id })
    if (data) {
      const updated = { ...member, ...data.member, membership: data.membership }
      setMember(updated)
      localStorage.setItem('krovex_member', JSON.stringify(updated))
    }
  }

  const isAdmin = staffUser?.rol === 'super_admin' || staffUser?.rol === 'admin'
  const isReceptionist = staffUser?.rol === 'recepcionista'
  const isTrainer = staffUser?.rol === 'entrenador'
  const isMember = !!member
  const isStaff = !!user && !!staffUser

  return (
    <AuthContext.Provider value={{
      user, staffUser, member, loading,
      signIn, memberSignIn, signOut, refreshMember,
      isAdmin, isReceptionist, isTrainer, isMember, isStaff,
      role: staffUser?.rol || (member ? 'miembro' : null)
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
