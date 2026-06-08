import React, { useState, useEffect, useMemo } from 'react';
import { localApi } from '../services/localApi';
import { Plus, Search, FileText, Download, Edit2, Copy, Trash2, MoreVertical, ExternalLink, Eye, BarChart3, PieChart as PieChartIcon, TrendingUp, Share2 } from 'lucide-react';
import { formatCurrency, cn } from '../lib/utils';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend, AreaChart, Area 
} from 'recharts';
import { motion } from 'framer-motion';

interface Quotation {
  id: string;
  quoteNumber: string;
  date: string;
  clientDetails: {
    name: string;
    companyName: string;
  };
  grandTotal: number;
  status: 'Draft' | 'Sent' | 'Accepted' | 'Rejected';
  paymentStatus?: 'Unpaid' | 'Partial' | 'Paid';
  createdBy: string;
  revision?: number;
}

interface DashboardProps {
  userRole: 'admin' | 'sales' | 'super_admin';
  companyId: string | null;
  onNewQuote: () => void;
  onEditQuote: (id: string) => void;
  onViewQuote: (id: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ userRole, companyId, onNewQuote, onEditQuote, onViewQuote }) => {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [filterPayment, setFilterPayment] = useState<string>('All');
  const [quoteToDelete, setQuoteToDelete] = useState<string | null>(null);
  const [usersMap, setUsersMap] = useState<Record<string, string>>({});

  const loadData = async () => {
    if (!userRole || (!companyId && userRole !== 'super_admin')) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [quotes, users] = await Promise.all([
        localApi.getQuotations(companyId || 'SUPER'),
        userRole === 'admin' || userRole === 'super_admin' ? localApi.getUsers(companyId || 'SUPER') : Promise.resolve([])
      ]);
      
      const uMap: Record<string, string> = {};
      if (Array.isArray(users)) {
        users.forEach((u: any) => {
          uMap[u.id] = u.displayName || u.username || 'Unknown';
        });
      }
      setUsersMap(uMap);
      
      const safeQuotes = Array.isArray(quotes) ? quotes : [];
      setQuotations(safeQuotes.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    } catch (error) {
      console.error('Dashboard load failed:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [userRole, companyId]);

  const handleDelete = async (id: string) => {
    setQuoteToDelete(id);
  };

  const confirmDelete = async () => {
    if (quoteToDelete) {
      try {
        await localApi.deleteQuotation(quoteToDelete);
        await loadData();
        setQuoteToDelete(null);
      } catch (error) {
        console.error('Delete failed:', error);
      }
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      await localApi.duplicateQuotation(id);
      await loadData();
    } catch (error) {
      console.error('Duplicate failed:', error);
    }
  };

  const filteredQuotes = quotations.filter(quote => {
    const creatorName = usersMap[quote.createdBy] || 'Unknown';
    const matchesSearch = 
      (quote.quoteNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (quote.clientDetails?.companyName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (quote.clientDetails?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (userRole === 'admin' && creatorName.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = filterStatus === 'All' || quote.status === filterStatus;
    const matchesPayment = filterPayment === 'All' || quote.paymentStatus === filterPayment;
    
    return matchesSearch && matchesStatus && matchesPayment;
  });

  const stats = [
    { label: 'Total Quotes', value: quotations.length, icon: FileText, color: 'blue', filterAction: 'All' },
    { label: 'Total Value', value: formatCurrency(quotations.reduce((acc, q) => acc + q.grandTotal, 0)), icon: FileText, color: 'green', filterAction: null },
    { label: 'Sent', value: quotations.filter(q => q.status === 'Sent').length, icon: FileText, color: 'yellow', filterAction: 'Sent' },
    { label: 'Accepted', value: quotations.filter(q => q.status === 'Accepted').length, icon: FileText, color: 'purple', filterAction: 'Accepted' },
  ];

  const chartData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split('T')[0];
    }).reverse();

    return last7Days.map(date => {
      const dayQuotes = quotations.filter(q => q.date === date);
      return {
        date: new Date(date).toLocaleDateString([], { month: 'short', day: 'numeric' }),
        value: dayQuotes.reduce((acc, q) => acc + q.grandTotal, 0),
        count: dayQuotes.length
      };
    });
  }, [quotations]);

  const statusData = useMemo(() => {
    const counts = {
      Draft: quotations.filter(q => q.status === 'Draft').length,
      Sent: quotations.filter(q => q.status === 'Sent').length,
      Accepted: quotations.filter(q => q.status === 'Accepted').length,
      Rejected: quotations.filter(q => q.status === 'Rejected').length,
    };
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [quotations]);

  const COLORS = ['#94a3b8', '#3b82f6', '#22c55e', '#ef4444'];

  if (loading) return <div className="h-64 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;

  if (userRole !== 'super_admin' && (!companyId || companyId === 'NONE')) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-center p-8 bg-white rounded-2xl border border-gray-100 shadow-sm">
        <FileText className="h-12 w-12 text-gray-300 mb-4" />
        <h2 className="text-xl font-bold text-gray-900">No Company Assigned</h2>
        <p className="text-gray-500 mt-2 max-w-md">
          Your account is not yet assigned to a company. Please contact the Super Admin to assign you to a business.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {userRole === 'admin' ? 'Master Dashboard' : 'My Dashboard'}
          </h1>
            <p className="text-gray-500 mt-1">
              {userRole === 'admin' ? 'Manage all company quotations and sales pipeline.' : 'Manage your quotations and sales pipeline.'}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={onNewQuote}
              className="flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all duration-200"
            >
              <Plus className="h-5 w-5" />
              Create New Quotation
            </button>
          </div>
        </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            onClick={() => stat.filterAction && setFilterStatus(stat.filterAction)}
            className={cn(
              "bg-white p-6 rounded-2xl border border-gray-100 shadow-sm transition-all",
              stat.filterAction ? "cursor-pointer hover:shadow-md hover:border-blue-100" : ""
            )}
          >
            <div className={cn(
              "h-12 w-12 rounded-xl flex items-center justify-center mb-4",
              stat.color === 'blue' && "bg-blue-50 text-blue-600",
              stat.color === 'green' && "bg-green-50 text-green-600",
              stat.color === 'yellow' && "bg-yellow-50 text-yellow-600",
              stat.color === 'purple' && "bg-purple-50 text-purple-600",
            )}>
              <stat.icon className="h-6 w-6" />
            </div>
            <p className="text-sm font-medium text-gray-500">{stat.label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              <h2 className="font-bold text-gray-900">Revenue Trend (Last 7 Days)</h2>
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 600, fill: '#94a3b8' }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 600, fill: '#94a3b8' }}
                  tickFormatter={(value) => `₹${value / 1000}k`}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#3b82f6" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorValue)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <PieChartIcon className="h-5 w-5 text-purple-600" />
            <h2 className="font-bold text-gray-900">Quote Status</h2>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                   contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Legend 
                  verticalAlign="bottom" 
                  height={36}
                  formatter={(value) => <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by quote #, client or company..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {['All', 'Draft', 'Sent', 'Accepted', 'Rejected'].map(status => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-medium transition-all",
                filterStatus === status
                  ? "bg-blue-600 text-white shadow-md shadow-blue-100"
                  : "bg-gray-50 text-gray-600 hover:bg-gray-100"
              )}
            >
              {status}
            </button>
          ))}
          <div className="w-px h-8 bg-gray-100 mx-2 hidden md:block" />
          {['All', 'Unpaid', 'Partial', 'Paid'].map(pStatus => (
            <button
              key={pStatus}
              onClick={() => setFilterPayment(pStatus)}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-medium transition-all border",
                filterPayment === pStatus
                  ? "bg-gray-800 text-white border-gray-800 shadow-md shadow-gray-100"
                  : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
              )}
            >
              {pStatus}
            </button>
          ))}
        </div>
      </div>

      {/* Quotations Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Quote #</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Client / Company</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Total Value</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                {(userRole === 'super_admin' || userRole === 'admin') && (
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Created By</th>
                )}
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
                {filteredQuotes.map((quote) => (
                  <tr
                    key={quote.id}
                    className="hover:bg-gray-50 transition-colors group"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-mono font-bold text-blue-600">{quote.quoteNumber}</div>
                      {quote.revision !== undefined && quote.revision > 0 && (
                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Rev {quote.revision}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900">{quote.clientDetails.companyName}</div>
                      <div className="text-xs text-gray-500">{quote.clientDetails.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {new Date(quote.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-bold text-gray-900">
                      {formatCurrency(quote.grandTotal)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col gap-1">
                        <span className={cn(
                          "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider w-fit",
                          quote.status === 'Draft' && "bg-yellow-100 text-yellow-700",
                          quote.status === 'Sent' && "bg-blue-100 text-blue-700",
                          quote.status === 'Accepted' && "bg-green-100 text-green-700",
                          quote.status === 'Rejected' && "bg-red-100 text-red-700",
                        )}>
                          {quote.status}
                        </span>
                        {quote.paymentStatus && (
                          <span className={cn(
                            "px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest w-fit border",
                            quote.paymentStatus === 'Paid' ? "bg-green-50 text-green-600 border-green-100" :
                            quote.paymentStatus === 'Partial' ? "bg-orange-50 text-orange-600 border-orange-100" :
                            "bg-gray-50 text-gray-400 border-gray-100"
                          )}>
                            {quote.paymentStatus}
                          </span>
                        )}
                      </div>
                    </td>
                    {(userRole === 'super_admin' || userRole === 'admin') && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {usersMap[quote.createdBy] || 'Unknown'}
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2 transition-opacity">
                        <button
                          onClick={() => {
                            const baseUrl = window.location.origin + window.location.pathname;
                            const text = `📄 Quotation ${quote.quoteNumber} from ${quote.clientDetails.companyName}\n\nTotal: ${formatCurrency(quote.grandTotal)}\n\nClick below to view the full PDF quotation:\n${baseUrl}?quoteId=${quote.id}`;
                            window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                          }}
                          className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all"
                          title="Share on WhatsApp"
                        >
                          <Share2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => onViewQuote(quote.id)}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                          title="View PDF"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => onEditQuote(quote.id)}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                          title="Edit"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDuplicate(quote.id)}
                          className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all"
                          title="Duplicate"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(quote.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        {filteredQuotes.length === 0 && !loading && (
          <div className="p-12 text-center">
            <div className="mx-auto h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <FileText className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">No quotations found</h3>
            <p className="text-gray-500 mt-1">Try adjusting your search or filters.</p>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {quoteToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Quotation</h3>
            <p className="text-gray-500 mb-6">Are you sure you want to delete this quotation? This action cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setQuoteToDelete(null)}
                className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-50 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white font-medium hover:bg-red-700 rounded-lg transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
