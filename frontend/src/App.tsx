import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Wallet, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Users, 
  History, 
  PlusCircle, 
  MinusCircle,
  ChevronRight,
  User as UserIcon,
  TrendingUp,
  Clock,
  LayoutDashboard,
  Send,
  ArrowRight,
  ShieldCheck,
  LogOut,
  RotateCcw,
  AlertCircle
} from 'lucide-react';
import api, { getAdminToken, setAdminToken } from './api/client';
import type { FundSummary, Transaction, Participant } from './api/types';
import { format } from 'date-fns';

// --- Components ---

const LoadingSpinner = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100px' }}>
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
      style={{ border: '4px solid var(--glass-border)', borderTop: '4px solid var(--primary)', borderRadius: '50%', width: '40px', height: '40px' }}
    />
  </div>
);

const Card = ({ children, className = "", style = {} }: { children: React.ReactNode, className?: string, style?: React.CSSProperties }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className={`glass-card ${className}`}
    style={{ padding: '24px', ...style }}
  >
    {children}
  </motion.div>
);

const Navbar = ({ 
  onTabChange, 
  activeTab, 
  isAdmin, 
  onLogout 
}: { 
  onTabChange: (tab: string) => void, 
  activeTab: string, 
  isAdmin: boolean,
  onLogout: () => void
}) => (
  <nav style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ background: 'var(--primary)', padding: '10px', borderRadius: '12px' }}>
        <Wallet size={24} color="white" />
      </div>
      <h1 style={{ fontSize: '24px', fontWeight: 800, letterSpacing: '-0.5px' }}>Common Fund</h1>
    </div>
    <div style={{ display: 'flex', gap: 16, background: 'rgba(30, 41, 59, 0.5)', padding: '6px', borderRadius: '16px', border: '1px solid var(--glass-border)' }}>
      {[
        { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { id: 'participants', icon: Users, label: 'Members' },
        ...(isAdmin ? [{ id: 'admin', icon: PlusCircle, label: 'Admin' }] : []),
        ...(!isAdmin ? [{ id: 'login', icon: ShieldCheck, label: 'Login' }] : [])
      ].map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`btn ${activeTab === tab.id ? 'btn-primary' : ''}`}
          style={{ 
            background: activeTab === tab.id ? 'var(--primary)' : 'transparent',
            color: activeTab === tab.id ? 'white' : 'var(--text-muted)',
            padding: '8px 16px'
          }}
        >
          <tab.icon size={18} />
          <span>{tab.label}</span>
        </button>
      ))}
      {isAdmin && (
        <button
          onClick={onLogout}
          className="btn"
          style={{ background: 'transparent', color: 'var(--accent-rose)', padding: '8px 16px' }}
        >
          <LogOut size={18} />
        </button>
      )}
    </div>
  </nav>
);

// --- Pages ---

const Login = ({ onLogin }: { onLogin: (token: string) => Promise<boolean> }) => {
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(false);
    const success = await onLogin(token);
    if (!success) setError(true);
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: '400px', margin: '100px auto 0', width: '100%', padding: '0 24px' }}>
      <Card>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '20px', background: 'rgba(99, 102, 241, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: 'var(--primary)' }}>
            <ShieldCheck size={32} />
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: 700 }}>Admin Login</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '8px' }}>Enter your secret token to unlock admin features</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label className="label">Secret Token</label>
            <input 
              className="form-input" 
              type="password" 
              placeholder="••••••••••••" 
              value={token}
              onChange={(e) => setToken(e.target.value)}
              required
            />
          </div>

          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-rose)', fontSize: '14px', fontWeight: 500 }}>
              <AlertCircle size={16} /> Invalid token. Please try again.
            </div>
          )}

          <button type="submit" className="btn btn-primary" disabled={loading} style={{ justifyContent: 'center' }}>
            {loading ? 'Verifying...' : 'Authorize Access'}
          </button>
        </form>
      </Card>
    </div>
  );
};

const AdminPanel = ({ onRefresh }: { onRefresh: () => void }) => {
  const [activeTab, setActiveTab] = useState<'deposit' | 'expense'>('deposit');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form states
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [participantName, setParticipantName] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const endpoint = activeTab === 'deposit' ? '/admin/deposit' : '/admin/expense';
      const payload = activeTab === 'deposit' 
        ? { amount: Number(amount), description, participant_name: participantName }
        : { amount: Number(amount), description };
      
      await api.post(endpoint, payload);
      setSuccess(true);
      setAmount('');
      setDescription('');
      setParticipantName('');
      onRefresh();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Action failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
        <button 
          onClick={() => setActiveTab('deposit')}
          className="btn"
          style={{ flex: 1, background: activeTab === 'deposit' ? 'var(--accent-emerald)' : 'rgba(255,255,255,0.05)', color: 'white' }}
        >
          <PlusCircle size={18} /> Income
        </button>
        <button 
          onClick={() => setActiveTab('expense')}
          className="btn"
          style={{ flex: 1, background: activeTab === 'expense' ? 'var(--accent-rose)' : 'rgba(255,255,255,0.05)', color: 'white' }}
        >
          <MinusCircle size={18} /> Expense
        </button>
      </div>

      <Card>
        <h3 style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          {activeTab === 'deposit' ? <TrendingUp color="var(--accent-emerald)" /> : <Send color="var(--accent-rose)" />}
          Add New {activeTab === 'deposit' ? 'Income' : 'Expense'}
        </h3>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {activeTab === 'deposit' && (
            <div>
              <label className="label">Participant Name</label>
              <input 
                className="form-input" 
                placeholder="Who contributed?" 
                value={participantName}
                onChange={(e) => setParticipantName(e.target.value)}
                required
              />
            </div>
          )}
          
          <div>
            <label className="label">Amount (₽)</label>
            <input 
              className="form-input" 
              type="number" 
              placeholder="0.00" 
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="label">{activeTab === 'deposit' ? 'Reason / Note' : 'Expense Description'}</label>
            <input 
              className="form-input" 
              placeholder={activeTab === 'deposit' ? "e.g. Monthly contribution" : "e.g. Server hosting"} 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          {error && <div style={{ color: 'var(--accent-rose)', fontSize: '14px', fontWeight: 500 }}>{error}</div>}
          {success && <div style={{ color: 'var(--accent-emerald)', fontSize: '14px', fontWeight: 500 }}>Success! Transaction added.</div>}

          <button type="submit" className="btn btn-primary" disabled={loading} style={{ justifyContent: 'center', marginTop: '12px' }}>
            {loading ? 'Processing...' : (
              <>
                Confirm Transaction <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>
      </Card>
    </div>
  );
};

const MemberDetail = ({ member, transactions, onBack }: { member: Participant, transactions: Transaction[], onBack: () => void }) => {
  const filtered = transactions.filter(t => t.participant_id === member.id);

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <button onClick={onBack} className="btn" style={{ marginBottom: '24px', paddingLeft: 0, color: 'var(--primary)' }}>
        <ArrowRight size={18} style={{ transform: 'rotate(180deg)' }} /> Back to Dashboard
      </button>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
        <Card style={{ height: 'fit-content' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '24px', background: 'var(--primary)', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
              <UserIcon size={40} />
            </div>
            <h2 style={{ marginBottom: '8px' }}>{member.name}</h2>
            <div style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '24px' }}>Member since {format(new Date(member.created_at), 'MMMM yyyy')}</div>
            
            <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '16px', borderRadius: '16px', color: 'var(--accent-emerald)' }}>
              <div style={{ fontSize: '12px', opacity: 0.8 }}>Total Contribution</div>
              <div style={{ fontSize: '24px', fontWeight: 800 }}>{member.contribution.toLocaleString()} ₽</div>
            </div>
          </div>
        </Card>

        <Card>
          <h3 style={{ marginBottom: '24px' }}>Personal History</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {filtered.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>No transactions found for this member.</p>
            ) : filtered.map((t) => (
              <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '16px', borderBottom: '1px solid var(--glass-border)' }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{t.description || 'Deposit'}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{format(new Date(t.timestamp), 'MMM dd, yyyy HH:mm')}</div>
                </div>
                <div style={{ fontWeight: 700, color: 'var(--accent-emerald)' }}>+{t.amount.toLocaleString()} ₽</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

const Dashboard = ({ 
  summary, 
  transactions, 
  onMemberClick, 
  isAdmin, 
  onRollback 
}: { 
  summary: FundSummary | null, 
  transactions: Transaction[], 
  onMemberClick: (m: Participant) => void,
  isAdmin: boolean,
  onRollback: (id: number) => void
}) => {
  if (!summary) return <LoadingSpinner />;

  return (
    <div style={{ padding: '0 24px 48px', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
      {/* Balance Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '40px' }}>
        <Card className="main-balance" style={{ background: 'linear-gradient(135deg, var(--primary) 0%, #4f46e5 100%)', gridColumn: 'span 2' }}>
           <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px', marginBottom: '8px', fontWeight: 500 }}>Total Balance</div>
           <div style={{ fontSize: '48px', fontWeight: 800, color: 'white', marginBottom: '24px' }}>
             {summary.total_balance.toLocaleString()} ₽
           </div>
           <div style={{ display: 'flex', gap: '32px' }}>
              <div style={{ background: 'rgba(255,255,255,0.1)', padding: '12px 20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Incomes</div>
                <div style={{ color: 'white', fontSize: '18px', fontWeight: 700 }}>+{summary.total_deposits.toLocaleString()}</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.05)', padding: '12px 20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Expenses</div>
                <div style={{ color: 'white', fontSize: '18px', fontWeight: 700 }}>-{summary.total_expenses.toLocaleString()}</div>
              </div>
           </div>
        </Card>
        
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <div style={{ color: 'var(--accent-emerald)' }}><TrendingUp size={24} /></div>
            <div style={{ fontWeight: 600 }}>Top Contributors</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {summary.participant_contributions.slice(0, 3).map((p, i) => (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                   <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(99, 102, 241, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, color: 'var(--primary)' }}>
                     {i+1}
                   </div>
                   <span style={{ fontWeight: 500 }}>{p.name}</span>
                </div>
                <span style={{ fontWeight: 600, color: 'var(--accent-emerald)' }}>{p.contribution.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <History size={20} color="var(--primary)" />
              <h3 style={{ fontSize: '20px', fontWeight: 700 }}>Recent Activity</h3>
            </div>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0px' }}>
            {transactions.slice(0, 10).map((t, i) => (
              <div key={t.id} style={{ 
                padding: '16px 0', 
                borderBottom: i === Math.min(transactions.length, 10) - 1 ? 'none' : '1px solid var(--glass-border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                opacity: t.is_voided ? 0.5 : 1
              }}>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <div style={{ 
                    width: '40px', 
                    height: '40px', 
                    borderRadius: '12px', 
                    background: t.category === 'DEPOSIT' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: t.category === 'DEPOSIT' ? 'var(--accent-emerald)' : 'var(--accent-rose)'
                  }}>
                    {t.category === 'DEPOSIT' ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '15px' }}>{t.description || (t.category === 'DEPOSIT' ? 'Deposit' : 'Expense')}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', gap: '8px', marginTop: '2px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={12} /> {format(new Date(t.timestamp), 'MMM dd, HH:mm')}</span>
                      {t.participant_id && <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><UserIcon size={12} /> Member</span>}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ 
                      fontWeight: 700, 
                      fontSize: '16px', 
                      color: t.category === 'DEPOSIT' ? 'var(--accent-emerald)' : 'var(--accent-rose)' 
                    }}>
                      {t.category === 'DEPOSIT' ? '+' : '-'}{Math.abs(t.amount).toLocaleString()} ₽
                    </div>
                    {t.is_voided && <div style={{ fontSize: '10px', color: 'var(--accent-rose)', fontWeight: 700, textTransform: 'uppercase' }}>Voided</div>}
                  </div>
                  {isAdmin && !t.is_voided && (
                    <button 
                      onClick={() => onRollback(t.id)}
                      title="Rollback Transaction"
                      style={{ 
                        background: 'rgba(244, 63, 94, 0.1)', 
                        border: 'none', 
                        padding: '8px', 
                        borderRadius: '8px', 
                        color: 'var(--accent-rose)', 
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(244, 63, 94, 0.2)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(244, 63, 94, 0.1)')}
                    >
                      <RotateCcw size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <Users size={20} color="var(--primary)" />
            <h3 style={{ fontSize: '20px', fontWeight: 700 }}>Members</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {summary.participant_contributions.map((p) => (
              <button 
                key={p.id}
                onClick={() => onMemberClick(p)}
                className="glass-card"
                style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  padding: '12px 16px',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: '16px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  width: '100%',
                  transition: 'transform 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.02)')}
                onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                    <UserIcon size={18} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '14px' }}>{p.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{p.contribution.toLocaleString()} ₽</div>
                  </div>
                </div>
                <ChevronRight size={16} color="var(--text-muted)" />
              </button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

// --- App Root ---

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedMember, setSelectedMember] = useState<Participant | null>(null);
  const [summary, setSummary] = useState<FundSummary | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  const fetchData = async () => {
    try {
      const [sumRes, transRes] = await Promise.all([
        api.get('/funds/balance'),
        api.get('/funds/history')
      ]);
      setSummary(sumRes.data);
      setTransactions(transRes.data);
    } catch (error) {
      console.error("Failed to fetch data", error);
    }
  };

  const checkAdminStatus = async () => {
    const token = getAdminToken();
    if (token) {
      try {
        await api.get('/admin/verify', { headers: { 'x-admin-token': token } });
        setIsAdmin(true);
      } catch (err) {
        setAdminToken('');
        setIsAdmin(false);
      }
    }
  };

  useEffect(() => {
    fetchData();
    checkAdminStatus();
  }, []);

  const handleLogin = async (token: string): Promise<boolean> => {
    try {
      await api.get('/admin/verify', { headers: { 'x-admin-token': token } });
      setAdminToken(token);
      setIsAdmin(true);
      setActiveTab('dashboard');
      return true;
    } catch (err) {
      return false;
    }
  };

  const handleLogout = () => {
    setAdminToken('');
    setIsAdmin(false);
    setActiveTab('dashboard');
  };

  const handleMemberClick = (member: Participant) => {
    setSelectedMember(member);
    setActiveTab('member-detail');
  };

  const handleRollback = async (id: number) => {
    if (!window.confirm("Are you sure you want to rollback this transaction?")) return;
    try {
      await api.patch(`/admin/transactions/${id}/rollback`);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Rollback failed.");
    }
  };

  return (
    <>
      <Navbar 
        activeTab={activeTab === 'member-detail' ? 'participants' : activeTab} 
        isAdmin={isAdmin}
        onLogout={handleLogout}
        onTabChange={(tab) => {
          setActiveTab(tab);
          setSelectedMember(null);
        }} 
      />
      
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <AnimatePresence mode="wait">
          {activeTab === 'login' && (
            <motion.div
              key="login"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Login onLogin={handleLogin} />
            </motion.div>
          )}

          {activeTab === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
            >
              <Dashboard 
                summary={summary} 
                transactions={transactions} 
                onMemberClick={handleMemberClick} 
                isAdmin={isAdmin}
                onRollback={handleRollback}
              />
            </motion.div>
          )}

          {activeTab === 'member-detail' && selectedMember && (
            <motion.div
              key="member-detail"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              style={{ padding: '0 24px' }}
            >
              <MemberDetail 
                member={selectedMember} 
                transactions={transactions} 
                onBack={() => setActiveTab('dashboard')} 
              />
            </motion.div>
          )}

          {activeTab === 'participants' && (
             <motion.div 
               key="participants"
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               exit={{ opacity: 0, y: -20 }}
               style={{ padding: '0 24px', maxWidth: '800px', margin: '0 auto', width: '100%' }}
             >
                <Card>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                    <Users size={24} color="var(--primary)" />
                    <h2 style={{ fontSize: '24px', fontWeight: 700 }}>Members List</h2>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
                    {summary?.participant_contributions.map(p => (
                      <button 
                        key={p.id}
                        onClick={() => handleMemberClick(p)}
                        className="glass-card"
                        style={{ padding: '20px', textAlign: 'center', cursor: 'pointer' }}
                      >
                        <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: 'rgba(99, 102, 241, 0.1)', margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                          <UserIcon size={24} />
                        </div>
                        <div style={{ fontWeight: 700 }}>{p.name}</div>
                        <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>{p.contribution.toLocaleString()} ₽</div>
                      </button>
                    ))}
                  </div>
                </Card>
             </motion.div>
          )}

          {isAdmin && activeTab === 'admin' && (
             <motion.div 
               key="admin"
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               exit={{ opacity: 0, y: -20 }}
               style={{ padding: '0 24px', maxWidth: '800px', margin: '0 auto', width: '100%' }}
             >
                <AdminPanel onRefresh={fetchData} />
             </motion.div>
          )}
        </AnimatePresence>
      </main>
      
      <footer style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
        Common Fund "КОНДИЦИИ" &copy; 2026. Premium Finance Management.
      </footer>
    </>
  );
}
