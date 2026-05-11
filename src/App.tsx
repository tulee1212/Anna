import React, { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import { format, parseISO, isValid } from 'date-fns';
import { 
  auth, db, doc, setDoc, getDoc, getDocs, collection, onSnapshot, 
  serverTimestamp, deleteDoc, updateDoc, addDoc, signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, signOut, onAuthStateChanged, createNewUser,
  storage, ref, uploadBytes, getDownloadURL, collectionGroup, query, where, updatePassword
} from './firebase';
import { User } from 'firebase/auth';
import { 
  LogOut, LayoutDashboard, Users as UsersIcon, Settings, AlertCircle, 
  Plus, FileText, Clock, X, Calendar, CheckCircle2, Check, ChevronLeft, ChevronDown, 
  ChevronRight, Trash2, DollarSign, Camera, Edit3, MoreVertical, Lock, Mail, UserPlus, User as UserIcon,
  BarChart as BarChartIcon, Eye, EyeOff, Menu, Star
} from 'lucide-react';

import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';

const MAIN_TEAM_ID = 'MEDIA_TEAM_01';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [teamData, setTeamData] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [initializingTeam, setInitializingTeam] = useState(false);
  const [currentView, setCurrentView] = useState<'dashboard' | 'projects' | 'settings' | 'project_detail' | 'reports' | 'performance'>('dashboard');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [allTasks, setAllTasks] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [viewDate, setViewDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(new Date().toISOString().split('T')[0]);
  const [editingProject, setEditingProject] = useState<any>(null);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [newReport, setNewReport] = useState({
    content: '',
    reportDate: new Date().toISOString().split('T')[0],
    projectId: ''
  });
  const [showQuickAdd, setShowQuickAdd] = useState<{show: boolean, category: 'photo' | 'video'}>({show: false, category: 'photo'});
  const [showScoreDetail, setShowScoreDetail] = useState<any>(null);
  const [quickAddCount, setQuickAddCount] = useState<number | string>('');
  const [quickAddDate, setQuickAddDate] = useState(new Date().toISOString().split('T')[0]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [isEditingProductCount, setIsEditingProductCount] = useState({ show: false, field: '' });
  const [tempProductCount, setTempProductCount] = useState(0);
  const [isEditingStatus, setIsEditingStatus] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [tempStatus, setTempStatus] = useState('');
  const [tempDescription, setTempDescription] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [newTaskImages, setNewTaskImages] = useState<string[]>([]);
  const [toast, setToast] = useState<{ show: boolean, message: string, type: 'success' | 'error' }>({ show: false, message: '', type: 'success' });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<{ show: boolean, memberId: string }>({ show: false, memberId: '' });
  const [editingMember, setEditingMember] = useState<any>(null);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [showKpiModal, setShowKpiModal] = useState(false);
  const [kpiForms, setKpiForms] = useState<Record<string, { output: number, quality: number, deadline: number }>>({});
  const [selectedKpiMember, setSelectedKpiMember] = useState<any>(null);
  const [showProjectQualityModal, setShowProjectQualityModal] = useState(false);
  const [qualityScore, setQualityScore] = useState<number>(10);
  const [selectedQualityProject, setSelectedQualityProject] = useState<any>(null);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [memberForm, setMemberForm] = useState({
    username: '',
    role: 'editor' as 'admin' | 'editor' | 'viewer',
    title: ''
  });
  const [newMemberForm, setNewMemberForm] = useState({
    username: '',
    password: '',
    role: 'editor' as 'admin' | 'editor' | 'viewer',
    title: ''
  });

  // Auth Form State
  const [authForm, setAuthForm] = useState({ username: '', password: '' });
  const [authError, setAuthError] = useState('');
  const [passwordChange, setPasswordChange] = useState({ newPassword: '', confirmPassword: '' });
  const [showMemberPasswords, setShowMemberPasswords] = useState<Record<string, boolean>>({});
  
  // Project Form State
  const [newProject, setNewProject] = useState({
    title: '',
    description: '',
    deadline: '',
    status: 'plan',
    productCount: 1,
    photoTarget: 0,
    videoTarget: 0,
    photoPoint: 1,
    videoPoint: 3,
    itemStatus: 'chưa nhận',
    projectType: 'photo'
  });

  const [projectListTab, setProjectListTab] = useState<'photo' | 'video' | 'outsource'>('photo');
  const [isProjectsMenuExpanded, setIsProjectsMenuExpanded] = useState(false);
  const [showAllDone, setShowAllDone] = useState(false);
  const [dashboardMonth, setDashboardMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [selectedReport, setSelectedReport] = useState<any>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  const handleFirestoreError = (error: any, operation: string, path: string) => {
    const errInfo = {
      error: error?.message || String(error),
      operation,
      path,
      auth: auth.currentUser ? { uid: auth.currentUser.uid, email: auth.currentUser.email } : 'Not logged in'
    };
    console.error('Firestore Error:', errInfo);
    showToast(`Lỗi Firestore (${operation}): ${errInfo.error}`, 'error');
  };

  useEffect(() => {
    const handleGlobalError = (event: ErrorEvent) => {
      console.error('Global Error:', event.error);
      showToast(`Lỗi hệ thống: ${event.error?.message || 'Đã xảy ra lỗi không xác định.'}`, 'error');
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled Rejection:', event.reason);
      showToast(`Lỗi bất đồng bộ: ${event.reason?.message || 'Đã xảy ra lỗi trong quá trình xử lý.'}`, 'error');
    };

    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  const getMemberData = (uidOrEmail?: string) => {
    if (!uidOrEmail) return null;
    const normalized = uidOrEmail.toLowerCase().trim();
    return members.find(m => 
      (m.uid && m.uid.toLowerCase() === normalized) || 
      (m.id && m.id.toLowerCase() === normalized) || 
      (m.email && m.email.toLowerCase() === normalized)
    );
  };

  const currentUserMember = members.find(m => (m.uid === user?.uid || m.id === user?.uid));
  const currentUserRole = currentUserMember?.role || 'viewer';
  const isAdmin = currentUserRole === 'admin' || user?.email === 'admin@production.team' || user?.email === 'leanhtu1212@gmail.com';
  const isEditor = currentUserRole === 'editor' || isAdmin;

  const dashboardReports = reports.filter(r => (r.reportDate || '').startsWith(dashboardMonth));

  // Task Form State
  const [newTask, setNewTask] = useState({
    title: '',
    category: 'pre-production' as 'pre-production' | 'photo' | 'video',
    status: 'completed' as 'pending' | 'in-progress' | 'completed',
    amount: 0,
    reportDate: new Date().toISOString().split('T')[0],
    dntt: false,
    deadline: '',
    difficulty: 1
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Auto-initialize or join the main team
  useEffect(() => {
    if (!user) return;

    const initTeam = async () => {
      setInitializingTeam(true);
      try {
        const teamRef = doc(db, 'teams', MAIN_TEAM_ID);
        const teamSnap = await getDoc(teamRef);

        if (!teamSnap.exists()) {
          // Create the main team if it doesn't exist
          await setDoc(teamRef, {
            id: MAIN_TEAM_ID,
            name: 'Media Production Team',
            createdAt: serverTimestamp(),
            createdBy: user.uid
          });
        }

        // Add user as member if not already
        const memberRef = doc(db, 'teams', MAIN_TEAM_ID, 'members', user.uid);
        const memberSnap = await getDoc(memberRef);

        if (!memberSnap.exists()) {
          // First user is admin, others are editors (unless they have admin email)
          const isFirstMember = !teamSnap.exists();
          const isAdminEmail = user.email === 'admin@production.team' || user.email === 'leanhtu1212@gmail.com';
          
          await setDoc(memberRef, {
            uid: user.uid,
            email: user.email,
            role: (isFirstMember || isAdminEmail) ? 'admin' : 'editor',
            joinedAt: serverTimestamp(),
            username: user.email?.split('@')[0] || 'User',
            title: (isFirstMember || isAdminEmail) ? 'Quản trị viên' : 'Thành viên'
          });
        }
      } catch (error) {
        console.error('Error initializing team:', error);
      } finally {
        setInitializingTeam(false);
        setLoading(false);
      }
    };

    initTeam();
  }, [user]);

  useEffect(() => {
    if (!user || loading || initializingTeam) return;

    // Listen to team data
    const teamRef = doc(db, 'teams', MAIN_TEAM_ID);
    const unsubscribeTeam = onSnapshot(teamRef, (snapshot) => {
      if (snapshot.exists()) {
        setTeamData(snapshot.data());
      }
    }, (error) => handleFirestoreError(error, 'get', `teams/${MAIN_TEAM_ID}`));

    // Listen to members
    const membersRef = collection(db, 'teams', MAIN_TEAM_ID, 'members');
    const unsubscribeMembers = onSnapshot(membersRef, (snapshot) => {
      const membersList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMembers(membersList);
    }, (error) => handleFirestoreError(error, 'list', `teams/${MAIN_TEAM_ID}/members`));

    // Listen to projects
    const projectsRef = collection(db, 'teams', MAIN_TEAM_ID, 'projects');
    const unsubscribeProjects = onSnapshot(projectsRef, (snapshot) => {
      const projectsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort by createdAt desc (newest first)
      projectsList.sort((a: any, b: any) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });
      setProjects(projectsList);
    }, (error) => handleFirestoreError(error, 'list', `teams/${MAIN_TEAM_ID}/projects`));

    // Listen to reports
    const reportsRef = collection(db, 'teams', MAIN_TEAM_ID, 'reports');
    const unsubscribeReports = onSnapshot(reportsRef, (snapshot) => {
      const reportsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort by reportDate desc, then by createdAt desc
      reportsList.sort((a: any, b: any) => {
        const dateCompare = (b.reportDate || '').localeCompare(a.reportDate || '');
        if (dateCompare !== 0) return dateCompare;
        return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
      });
      setReports(reportsList);
    }, (error) => handleFirestoreError(error, 'list', `teams/${MAIN_TEAM_ID}/reports`));

    // Listen to all tasks for dashboard progress
    const allTasksQuery = query(collectionGroup(db, 'tasks'));
    const unsubscribeAllTasks = onSnapshot(allTasksQuery, (snapshot) => {
      const tasksList = snapshot.docs
        .map(doc => {
          const data = doc.data();
          // Infer projectId from path if missing: teams/{teamId}/projects/{projectId}/tasks/{taskId}
          const pathParts = doc.ref.path.split('/');
          const teamIdFromPath = pathParts[1];
          const projectIdFromPath = pathParts[3];
          
          // Only include tasks from this team
          if (data.teamId !== MAIN_TEAM_ID && teamIdFromPath !== MAIN_TEAM_ID) {
            return null;
          }
          
          return { id: doc.id, projectId: data.projectId || projectIdFromPath, ...data };
        })
        .filter(t => t !== null);
      setAllTasks(tasksList);
    }, (error) => console.error("Error listening to all tasks:", error));

    return () => {
      unsubscribeTeam();
      unsubscribeMembers();
      unsubscribeProjects();
      unsubscribeReports();
      unsubscribeAllTasks();
    };
  }, [user, loading, initializingTeam]);

  // Listen to tasks when a project is selected
  useEffect(() => {
    if (!user || !selectedProjectId) {
      setTasks([]);
      return;
    }

    const tasksRef = collection(db, 'teams', MAIN_TEAM_ID, 'projects', selectedProjectId, 'tasks');
    const unsubscribeTasks = onSnapshot(tasksRef, (snapshot) => {
      const tasksList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort by reportDate desc, then by createdAt desc
      tasksList.sort((a: any, b: any) => {
        const dateCompare = (b.reportDate || '').localeCompare(a.reportDate || '');
        if (dateCompare !== 0) return dateCompare;
        return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
      });
      setTasks(tasksList);
    }, (error) => handleFirestoreError(error, 'list', `teams/${MAIN_TEAM_ID}/projects/${selectedProjectId}/tasks`));

    return () => unsubscribeTasks();
  }, [user, selectedProjectId]);

  // Auto-transition to DONE status and revert if needed
  useEffect(() => {
    if (!user || loading || initializingTeam || projects.length === 0 || allTasks.length === 0) return;

    const checkStatusTransitions = async () => {
      for (const project of projects) {
        const projectTasks = allTasks.filter(t => t.projectId === project.id);
        
        // Calculate Photo Progress
        const photoDone = projectTasks.filter(t => t.category === 'photo').reduce((sum, t) => sum + (Number(t.quantity) || 1), 0);
        const photoTarget = Number(project.photoTarget) || 0;
        const photoReached = photoTarget > 0 ? photoDone >= photoTarget : true;

        // Calculate Video Progress
        const videoDone = projectTasks.filter(t => t.category === 'video').reduce((sum, t) => sum + (Number(t.quantity) || 1), 0);
        const videoTarget = Number(project.videoTarget) || 0;
        const videoReached = videoTarget > 0 ? videoDone >= videoTarget : true;

        // Check All DNTT (only for pre-production/cost tasks)
        const costTasks = projectTasks.filter(t => t.category === 'pre-production');
        const allDNTTTicked = costTasks.length > 0 ? costTasks.every(t => t.dntt === true) : true;

        // Requirement: Photo 100%, Video 100%, and all DNTT ticked
        const hasWork = photoTarget > 0 || videoTarget > 0 || costTasks.length > 0;
        const meetsDoneCriteria = photoReached && videoReached && allDNTTTicked && hasWork;

        if (project.status !== 'done' && meetsDoneCriteria) {
           try {
             await updateDoc(doc(db, 'teams', MAIN_TEAM_ID, 'projects', project.id), {
               status: 'done',
               updatedAt: serverTimestamp()
             });
             showToast(`Project "${project.title}" đã hoàn thành 100% & duyệt hết DNTT -> Auto chuyển sang DONE!`, 'success');
           } catch (error) {
             console.error("Error auto-updating project status:", error);
           }
        } else if (project.status === 'done' && !meetsDoneCriteria) {
           try {
             await updateDoc(doc(db, 'teams', MAIN_TEAM_ID, 'projects', project.id), {
               status: 'post-production',
               updatedAt: serverTimestamp()
             });
             showToast(`Project "${project.title}" chưa đạt điều kiện hoàn thành -> Tự động nhảy về Hậu kỳ!`, 'error');
           } catch (error) {
             console.error("Error auto-reverting project status:", error);
           }
        }
      }
    };

    checkStatusTransitions();
  }, [projects, allTasks, user, loading, initializingTeam]);

  const formatNumberInput = (value: string | number) => {
    const stringValue = String(value);
    const digits = stringValue.replace(/\D/g, "");
    const cleanDigits = digits.replace(/^0+/, "");
    if (cleanDigits === "") return "0";
    return cleanDigits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  const parseNumberInput = (formattedValue: string) => {
    return Number(formattedValue.replace(/,/g, "")) || 0;
  };

  const normalizeText = (text: string) => {
    if (!text) return '';
    return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setIsProcessing(true);
    try {
      const username = authForm.username.trim();
      if (!username) {
        setAuthError('Tên đăng nhập không được để trống.');
        setIsProcessing(false);
        return;
      }
      const email = username.includes('@') ? username : `${username}@production.team`;
      const userCredential = await signInWithEmailAndPassword(auth, email, authForm.password);
      if (userCredential.user) {
        const memberRef = doc(db, 'teams', MAIN_TEAM_ID, 'members', userCredential.user.uid);
        await updateDoc(memberRef, {
          password: authForm.password,
          updatedAt: serverTimestamp()
        }).catch(err => console.error("Could not sync password to Firestore:", err));
      }
    } catch (error: any) {
      console.error('Login error:', error);
      if (error.code === 'auth/operation-not-allowed') {
        setAuthError('Đăng nhập bằng email/mật khẩu chưa được bật trong Firebase Console. Vui lòng vào Authentication > Sign-in method và bật Email/Password.');
      } else if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        setAuthError('Tên đăng nhập hoặc mật khẩu không chính xác.');
      } else {
        setAuthError(`Lỗi đăng nhập (${error.code}): ${error.message}`);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddNewMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || isProcessing) return;

    if (!isAdmin) {
      showToast('Chỉ Admin mới có quyền thêm thành viên.', 'error');
      return;
    }

    if (members.length >= 10) {
      showToast('Hệ thống đã đạt giới hạn tối đa 10 thành viên. Vui lòng xóa bớt thành viên cũ để thêm mới.', 'error');
      return;
    }

    if (newMemberForm.password.length < 6) {
      showToast('Mật khẩu phải có ít nhất 6 ký tự.', 'error');
      return;
    }

    setIsProcessing(true);
    try {
      const username = newMemberForm.username.trim();
      if (!username) {
        showToast('Tên đăng nhập không được để trống.', 'error');
        setIsProcessing(false);
        return;
      }
      if (username.includes(' ')) {
        showToast('Tên đăng nhập không được chứa khoảng trắng.', 'error');
        setIsProcessing(false);
        return;
      }

      // Check if username already exists in current members
      const usernameExists = members.some(m => m.username?.toLowerCase() === username.toLowerCase());
      if (usernameExists) {
        showToast('Tên đăng nhập này đã tồn tại trong hệ thống.', 'error');
        setIsProcessing(false);
        return;
      }

      const email = username.includes('@') ? username : `${username}@production.team`;
      
      // Create user in Firebase Auth using secondary app
      let newUser;
      try {
        newUser = await createNewUser(email, newMemberForm.password);
      } catch (authError: any) {
        if (authError.code === 'auth/email-already-in-use') {
          showToast('Email hoặc tên đăng nhập này đã được sử dụng trong hệ thống Auth.', 'error');
        } else {
          showToast(`Lỗi Auth: ${authError.message || 'Không xác định'}`, 'error');
        }
        setIsProcessing(false);
        return;
      }
      
      // Add to members collection
      await setDoc(doc(db, 'teams', MAIN_TEAM_ID, 'members', newUser.uid), {
        uid: newUser.uid,
        email: newUser.email,
        username: username,
        password: newMemberForm.password,
        role: newMemberForm.role,
        title: newMemberForm.title,
        joinedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      setShowAddMemberModal(false);
      setNewMemberForm({ username: '', password: '', role: 'editor', title: '' });
      showToast('Thêm thành viên thành công!');
    } catch (error: any) {
      console.error('Error adding member:', error);
      showToast(`Lỗi khi thêm thành viên: ${error.message || 'Vui lòng thử lại sau.'}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const currentUserRole = members.find(m => m.uid === user.uid)?.role;
    if (currentUserRole === 'viewer') {
      showToast('Bạn không có quyền tạo/sửa Project.', 'error');
      return;
    }

    setIsProcessing(true);
    try {
      if (editingProject) {
        const projectRef = doc(db, 'teams', MAIN_TEAM_ID, 'projects', editingProject.id);
        await updateDoc(projectRef, {
          ...newProject,
          updatedAt: serverTimestamp()
        });
      } else {
        const projectId = Math.random().toString(36).substring(2, 9).toUpperCase();
        await setDoc(doc(db, 'teams', MAIN_TEAM_ID, 'projects', projectId), {
          id: projectId,
          ...newProject,
          status: 'plan',
          createdAt: serverTimestamp(),
          createdBy: user.uid
        });
      }
      setShowProjectModal(false);
      setEditingProject(null);
      setNewProject({ title: '', description: '', deadline: '', status: 'plan', productCount: 1, photoTarget: 0, videoTarget: 0, photoPoint: 0, videoPoint: 0, itemStatus: 'chưa nhận', projectType: 'photo' });
      setCurrentView('projects');
    } catch (error) {
      handleFirestoreError(error, editingProject ? 'update' : 'write', `teams/${MAIN_TEAM_ID}/projects`);
    } finally {
      setIsProcessing(false);
    }
  };

  const [showProjectDeleteConfirm, setShowProjectDeleteConfirm] = useState<{ show: boolean, projectId: string }>({ show: false, projectId: '' });

  const handleDeleteProject = async (projectId: string) => {
    if (!user || isProcessing) return;
    if (!isAdmin) {
      showToast('Chỉ Admin mới có quyền xóa Project.', 'error');
      return;
    }
    
    setIsProcessing(true);
    try {
      await deleteDoc(doc(db, 'teams', MAIN_TEAM_ID, 'projects', projectId));
      showToast('Đã xóa Project thành công!');
      setShowProjectDeleteConfirm({ show: false, projectId: '' });
      setCurrentView('projects');
      setSelectedProjectId(null);
    } catch (error) {
      handleFirestoreError(error, 'delete', `teams/${MAIN_TEAM_ID}/projects/${projectId}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveKpi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedKpiMember) return;
    
    const memberId = selectedKpiMember.uid || selectedKpiMember.id;
    const form = kpiForms[memberId];
    
    try {
      setIsProcessing(true);
      await updateDoc(doc(db, 'teams', MAIN_TEAM_ID, 'members', memberId), {
        kpiOutput: Number(form.output),
        kpiQuality: Number(form.quality),
        kpiDeadline: Number(form.deadline)
      });
      
      setToast({ show: true, message: 'Cập nhật KPI thành công', type: 'success' });
      setShowKpiModal(false);
    } catch (error) {
      handleFirestoreError(error, 'update', `teams/${MAIN_TEAM_ID}/members/${memberId}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveProjectQuality = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQualityProject) return;
    
    try {
      setIsProcessing(true);
      await updateDoc(doc(db, 'teams', MAIN_TEAM_ID, 'projects', selectedQualityProject.id), {
        qualityScore: qualityScore,
        status: 'done',
        updatedAt: serverTimestamp()
      });
      
      setToast({ show: true, message: 'Đã hoàn thành Project và đánh giá chất lượng', type: 'success' });
      setShowProjectQualityModal(false);
      setSelectedQualityProject(null);
    } catch (error) {
      handleFirestoreError(error, 'update', `teams/${MAIN_TEAM_ID}/projects/${selectedQualityProject.id}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const [quickAddImages, setQuickAddImages] = useState<string[]>([]);

  const handleAddDailyProgress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId || !auth.currentUser || isProcessing) return;
    
    const currentUserRole = members.find(m => m.uid === auth.currentUser.uid)?.role;
    if (currentUserRole === 'viewer') {
      showToast('Bạn không có quyền cập nhật tiến độ.', 'error');
      return;
    }

    setIsProcessing(true);
    const category = showQuickAdd.category;
    const finalCount = quickAddCount === '' ? 0 : Number(quickAddCount);
    
    if (finalCount <= 0 && quickAddImages.length === 0) {
      showToast('Vui lòng nhập số lượng hoặc tải ảnh lên.', 'error');
      setIsProcessing(false);
      return;
    }
    
    const tasksRef = collection(db, `teams/${MAIN_TEAM_ID}/projects/${selectedProjectId}/tasks`);
    
    try {
      // Create a single entry for the day with the specified quantity
      const taskRef = await addDoc(tasksRef, {
        title: `${finalCount} ${category === 'photo' ? 'Ảnh' : 'Video'}`,
        category,
        status: 'completed',
        amount: 0,
        quantity: finalCount,
        images: quickAddImages,
        createdAt: serverTimestamp(),
        createdBy: auth.currentUser.uid,
        reportDate: quickAddDate,
        projectId: selectedProjectId,
        teamId: MAIN_TEAM_ID
      });

      // Auto-create report entry
      const projectForReport = projects.find(p => p.id === selectedProjectId);
      const currentUser = auth.currentUser;
      
      if (currentUser) {
        const userIdentifier = currentUser.email?.split('@')[0] || currentUser.displayName || 'Thành viên';
        const reportContent = `${userIdentifier} hoàn thành +${finalCount} ${category === 'photo' ? 'Ảnh' : 'Video'} - Dự án: ${projectForReport?.title || 'N/A'}`;
        
        try {
          await addDoc(collection(db, 'teams', MAIN_TEAM_ID, 'reports'), {
            content: `Báo cáo tự động: ${reportContent}`,
            reportDate: quickAddDate,
            projectId: selectedProjectId,
            createdAt: serverTimestamp(),
            createdBy: currentUser.uid,
            userEmail: currentUser.email || 'N/A',
            relatedTaskId: taskRef.id // Link the task to the report
          });
        } catch (reportErr) {
          console.error("Auto-report failed in QuickAdd:", reportErr);
        }
      }

      // Auto-update project status
      const project = projects.find(p => p.id === selectedProjectId);
      if (project) {
        const projectTasks = allTasks.filter(t => t.projectId === selectedProjectId);
        // Include the new task in calculation
        const updatedTasks = [...projectTasks, { category, quantity: finalCount }];
        
        const photoDone = updatedTasks.filter(t => t.category === 'photo').reduce((sum, t) => sum + (t.quantity || 1), 0);
        const videoDone = updatedTasks.filter(t => t.category === 'video').reduce((sum, t) => sum + (t.quantity || 1), 0);
        
        const photoProgress = project.photoTarget > 0 ? (photoDone / project.photoTarget) : 1;
        const videoProgress = project.videoTarget > 0 ? (videoDone / project.videoTarget) : 1;

        let newStatus = project.status;
        if (photoProgress >= 1 && videoProgress >= 1) {
          newStatus = 'done';
        } else {
          newStatus = 'post-production';
        }

        if (newStatus !== project.status) {
          await updateDoc(doc(db, 'teams', MAIN_TEAM_ID, 'projects', selectedProjectId), { status: newStatus });
        }
      }

      setShowQuickAdd({show: false, category: 'photo'});
      setQuickAddCount('');
      setQuickAddImages([]);
    } catch (error) {
      handleFirestoreError(error, 'write', `teams/${MAIN_TEAM_ID}/projects/${selectedProjectId}/tasks`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedProjectId || isProcessing) return;

    const currentUserRole = members.find(m => m.uid === user.uid)?.role;
    if (currentUserRole === 'viewer') {
      showToast('Bạn không có quyền thêm/sửa Task.', 'error');
      return;
    }

    setIsProcessing(true);
    try {
      if (editingTask) {
        const taskDocRef = doc(db, 'teams', MAIN_TEAM_ID, 'projects', selectedProjectId, 'tasks', editingTask.id);
        const updateData: any = {
          ...newTask,
          images: newTaskImages,
          updatedAt: serverTimestamp()
        };
        
        // If status changing to completed, record completedAt
        if (newTask.status === 'completed' && editingTask.status !== 'completed') {
          updateData.completedAt = serverTimestamp();
        }
        
        await updateDoc(taskDocRef, updateData);
      } else {
        const taskId = Math.random().toString(36).substring(2, 9).toUpperCase();
        const taskData: any = {
          id: taskId,
          ...newTask,
          createdAt: serverTimestamp(),
          createdBy: user.uid,
          quantity: 1,
          images: newTaskImages,
          projectId: selectedProjectId,
          teamId: MAIN_TEAM_ID
        };
        
        // If created as completed, set completedAt
        if (newTask.status === 'completed' || newTask.dntt) {
          taskData.completedAt = serverTimestamp();
        }
        
        // Ensure dntt is false for new pre-prod tasks if not set
        if (newTask.category === 'pre-production' && newTask.dntt === undefined) {
          taskData.dntt = false;
        }
        
        await setDoc(doc(db, 'teams', MAIN_TEAM_ID, 'projects', selectedProjectId, 'tasks', taskId), taskData);

        // Auto-create report entry if it's photo/video OR if it's a DNTT
        if (((newTask.category === 'photo' || newTask.category === 'video') || (newTask.category === 'pre-production' && newTask.dntt)) && auth.currentUser) {
          const currentUser = auth.currentUser;
          const projectForReport = projects.find(p => p.id === selectedProjectId);
          const userIdentifier = currentUser.email?.split('@')[0] || currentUser.displayName || 'Thành viên';
          
          let reportContent = '';
          if (newTask.category === 'pre-production' && newTask.dntt) {
            reportContent = `${userIdentifier} đã tạo DNTT: ${newTask.title} (${(newTask.amount || 0).toLocaleString()}đ) - Dự án: ${projectForReport?.title || 'N/A'}`;
          } else {
            reportContent = `${userIdentifier} hoàn thành +1 ${newTask.category === 'photo' ? 'Ảnh' : 'Video'} - Dự án: ${projectForReport?.title || 'N/A'}`;
          }
          
          try {
            await addDoc(collection(db, 'teams', MAIN_TEAM_ID, 'reports'), {
              content: `Báo cáo tự động: ${reportContent}`,
              reportDate: newTask.reportDate,
              projectId: selectedProjectId,
              createdAt: serverTimestamp(),
              createdBy: currentUser.uid,
              userEmail: currentUser.email || 'N/A',
              relatedTaskId: taskId // Link the taskId
            });
          } catch (reportErr) {
            console.error("Auto-report failed in SaveTask:", reportErr);
          }
        }

        // Auto-update project status
        const project = projects.find(p => p.id === selectedProjectId);
        if (project) {
          const projectTasks = allTasks.filter(t => t.projectId === selectedProjectId);
          const updatedTasks = [...projectTasks, { category: newTask.category, quantity: 1 }];
          
          const photoDone = updatedTasks.filter(t => t.category === 'photo').reduce((sum, t) => sum + (t.quantity || 1), 0);
          const videoDone = updatedTasks.filter(t => t.category === 'video').reduce((sum, t) => sum + (t.quantity || 1), 0);
          const hasCosts = updatedTasks.some(t => t.category === 'pre-production');
          
          const photoProgress = project.photoTarget > 0 ? (photoDone / project.photoTarget) : 1;
          const videoProgress = project.videoTarget > 0 ? (videoDone / project.videoTarget) : 1;

          let newStatus = project.status;
          if (photoProgress >= 1 && videoProgress >= 1) {
            newStatus = 'done';
          } else if (photoDone > 0 || videoDone > 0) {
            newStatus = 'post-production';
          } else if (hasCosts) {
            newStatus = 'pre-production';
          }

          if (newStatus !== project.status) {
            await updateDoc(doc(db, 'teams', MAIN_TEAM_ID, 'projects', selectedProjectId), { status: newStatus });
          }
        }
      }
      setShowTaskModal(false);
      setEditingTask(null);
      setNewTaskImages([]);
      setNewTask({ title: '', category: 'pre-production', status: 'pending', amount: 0, reportDate: new Date().toISOString().split('T')[0], dntt: false });
    } catch (error) {
      handleFirestoreError(error, editingTask ? 'update' : 'write', `teams/${MAIN_TEAM_ID}/projects/${selectedProjectId}/tasks`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Shared image upload logic
  const uploadImageToStorage = async (file: File, folder: string): Promise<string> => {
    if (!storage) {
      throw new Error('Firebase Storage chưa được khởi tạo. Hãy kiểm tra cấu hình Firebase.');
    }

    if (file.size > 10 * 1024 * 1024) {
      throw new Error('Kích thước ảnh quá lớn (tối đa 10MB)');
    }

    // Sanitize filename: remove special characters and spaces
    const safeName = file.name.replace(/[^a-z0-9.]/gi, '_').toLowerCase() || 'image';
    const fileName = `${folder}/${Date.now()}_${safeName}`;
    
    try {
      const storageRef = ref(storage, fileName);
      const metadata = { 
        contentType: file.type || 'image/jpeg',
        customMetadata: {
          'uploadedBy': user?.uid || 'anonymous',
          'originalName': file.name
        }
      };
      
      const uploadResult = await uploadBytes(storageRef, file, metadata);
      console.log('Upload success:', uploadResult.ref.fullPath);
      
      const downloadURL = await getDownloadURL(storageRef);
      return downloadURL;
    } catch (error: any) {
      console.error('Storage Upload Error Detail:', error);
      if (error.code === 'storage/unauthorized') {
        throw new Error('Bạn không có quyền tải ảnh lên Storage. Hãy kiểm tra Rules của Firebase Storage.');
      }
      if (error.code === 'storage/quota-exceeded') {
        throw new Error('Đã hết hạn mức sử dụng Storage (Quota exceeded).');
      }
      throw error;
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input value to allow selecting the same file again
    e.target.value = '';

    setUploadingImage(true);
    try {
      const downloadURL = await uploadImageToStorage(file, 'tasks');
      setNewTaskImages(prev => [...prev, downloadURL]);
      showToast('Tải ảnh lên thành công!', 'success');
    } catch (error: any) {
      showToast(`Lỗi: ${error.message || 'Lỗi không xác định'}.`, 'error');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Reset input value
    e.target.value = '';

    setUploadingImage(true);
    try {
      const downloadURL = await uploadImageToStorage(file, 'avatars');
      
      // Update member document in Firestore
      const memberRef = doc(db, 'teams', MAIN_TEAM_ID, 'members', user.uid);
      await updateDoc(memberRef, {
        avatarUrl: downloadURL
      });
      
      showToast('Cập nhật ảnh đại diện thành công!', 'success');
    } catch (error: any) {
      showToast(`Lỗi: ${error.message || 'Lỗi không xác định'}.`, 'error');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleUpdateTarget = async (field: string, value: number) => {
    if (!selectedProjectId || isProcessing) return;
    setIsProcessing(true);
    try {
      const projectRef = doc(db, 'teams', MAIN_TEAM_ID, 'projects', selectedProjectId);
      await updateDoc(projectRef, {
        [field]: value
      });
      setIsEditingProductCount({ show: false, field: '' });
    } catch (error) {
      handleFirestoreError(error, 'update', `teams/${MAIN_TEAM_ID}/projects/${selectedProjectId}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !editingMember || isProcessing) return;

    if (!isAdmin) {
      showToast('Chỉ Admin mới có quyền chỉnh sửa thành viên.', 'error');
      return;
    }

    setIsProcessing(true);
    try {
      const memberId = editingMember.id || editingMember.uid;
      const memberRef = doc(db, 'teams', MAIN_TEAM_ID, 'members', memberId);
      await updateDoc(memberRef, {
        username: memberForm.username,
        role: memberForm.role,
        title: memberForm.title,
        updatedAt: serverTimestamp()
      });
      setShowMemberModal(false);
      setEditingMember(null);
      showToast('Cập nhật thành viên thành công!');
    } catch (error: any) {
      console.error('Update member error:', error);
      showToast(`Lỗi khi cập nhật thành viên: ${error.message}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteMember = async (memberUid: string) => {
    if (!user || isProcessing) return;
    
    if (!isAdmin) {
      showToast('Chỉ Admin mới có quyền xóa thành viên.', 'error');
      return;
    }

    if (memberUid === user.uid) {
      showToast('Bạn không thể tự xóa chính mình.', 'error');
      return;
    }

    setIsProcessing(true);
    try {
      const memberRef = doc(db, 'teams', MAIN_TEAM_ID, 'members', memberUid);
      await deleteDoc(memberRef);
      showToast('Đã xóa thành viên thành công!');
      setShowDeleteConfirm({ show: false, memberId: '' });
    } catch (error: any) {
      console.error('Delete member error:', error);
      handleFirestoreError(error, 'delete', `teams/${MAIN_TEAM_ID}/members/${memberUid}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || isProcessing) return;

    if (passwordChange.newPassword !== passwordChange.confirmPassword) {
      showToast('Mật khẩu xác nhận không khớp.', 'error');
      return;
    }

    if (passwordChange.newPassword.length < 6) {
      showToast('Mật khẩu phải có ít nhất 6 ký tự.', 'error');
      return;
    }

    setIsProcessing(true);
    try {
      if (user) {
        await updatePassword(user, passwordChange.newPassword);
        const memberRef = doc(db, 'teams', MAIN_TEAM_ID, 'members', user.uid);
        await updateDoc(memberRef, {
          password: passwordChange.newPassword,
          updatedAt: serverTimestamp()
        });
        showToast('Đổi mật khẩu thành công!');
        setPasswordChange({ newPassword: '', confirmPassword: '' });
      }
    } catch (error: any) {
      console.error('Password change error:', error);
      if (error.code === 'auth/requires-recent-login') {
        showToast('Cần đăng nhập lại gần đây để đổi mật khẩu. Vui lòng Refresh trang.', 'error');
      } else {
        showToast(`Lỗi: ${error.message}`, 'error');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || isProcessing) return;

    setIsProcessing(true);
    try {
      const reportId = Math.random().toString(36).substring(2, 9).toUpperCase();
      
      // Process keywords for task updates - Pass the reportId to link tasks
      await processReportKeywords(newReport.content, newReport.projectId, reportId);

      await setDoc(doc(db, 'teams', MAIN_TEAM_ID, 'reports', reportId), {
        id: reportId,
        content: newReport.content,
        reportDate: newReport.reportDate,
        projectId: newReport.projectId || null,
        createdAt: serverTimestamp(),
        createdBy: user.uid,
        userEmail: user.email
      });
      setShowReportModal(false);
      setNewReport({ content: '', reportDate: new Date().toISOString().split('T')[0], projectId: '' });
    } catch (error) {
      handleFirestoreError(error, 'write', `teams/${MAIN_TEAM_ID}/reports`);
    } finally {
      setIsProcessing(false);
    }
  };

  const processReportKeywords = async (content: string, selectedProjectId?: string, sourceReportId?: string) => {
    const lowerContent = content.toLowerCase();
    
    let targetProjects = selectedProjectId 
      ? projects.filter(p => p.id === selectedProjectId)
      : projects.filter(p => p.title && lowerContent.includes(p.title.toLowerCase()));

    // Deduplicate overlapping nested project names
    if (!selectedProjectId && targetProjects.length > 1) {
      targetProjects = targetProjects.filter(p1 => 
        !targetProjects.some(p2 => 
          p1.id !== p2.id && 
          p2.title.toLowerCase().includes(p1.title.toLowerCase()) && 
          p1.title.length < p2.title.length
        )
      );
    }

    for (const project of targetProjects) {
      // Find patterns like "xong 5 ảnh", "5 ảnh xong", "done 2 video", etc.
      const photoRegex = /(?:xong|done|hoàn thành|đã làm)\s+(\d+)\s+(?:ảnh|hình|photo|pic)|(\d+)\s+(?:ảnh|hình|photo|pic)\s+(?:xong|done|hoàn thành|đã làm)/g;
      const videoRegex = /(?:xong|done|hoàn thành|đã làm)\s+(\d+)\s+(?:video|clip|phim|vid)|(\d+)\s+(?:video|clip|phim|vid)\s+(?:xong|done|hoàn thành|đã làm)/g;

      let photoCount = 0;
      let videoCount = 0;
      let match;

      while ((match = photoRegex.exec(lowerContent)) !== null) {
        photoCount += parseInt(match[1] || match[2]);
      }
      while ((match = videoRegex.exec(lowerContent)) !== null) {
        videoCount += parseInt(match[1] || match[2]);
      }

      if (photoCount > 0) {
        const isDuplicate = sourceReportId && allTasks.some(t => 
          t.sourceReportId === sourceReportId && 
          t.projectId === project.id && 
          t.category === 'photo'
        );

        if (!isDuplicate) {
          await addDoc(collection(db, 'teams', MAIN_TEAM_ID, 'projects', project.id, 'tasks'), {
            title: `Báo cáo: +${photoCount} Ảnh`,
            category: 'photo',
            status: 'completed',
            quantity: photoCount,
            reportDate: newReport.reportDate,
            createdAt: serverTimestamp(),
            createdBy: user?.uid,
            projectId: project.id,
            teamId: MAIN_TEAM_ID,
            sourceReportId: sourceReportId || null // Link back to the report
          });
        }
      }

      if (videoCount > 0) {
        const isDuplicate = sourceReportId && allTasks.some(t => 
          t.sourceReportId === sourceReportId && 
          t.projectId === project.id && 
          t.category === 'video'
        );

        if (!isDuplicate) {
          await addDoc(collection(db, 'teams', MAIN_TEAM_ID, 'projects', project.id, 'tasks'), {
            title: `Báo cáo: +${videoCount} Video`,
            category: 'video',
            status: 'completed',
            quantity: videoCount,
            reportDate: newReport.reportDate,
            createdAt: serverTimestamp(),
            createdBy: user?.uid,
            projectId: project.id,
            teamId: MAIN_TEAM_ID,
            sourceReportId: sourceReportId || null // Link back to the report
          });
        }
      }

      // Check for DNTT keywords with flexible patterns
      // Support: dntt [name], #dntt [name], +dntt [name], @dntt [name], xong dntt [name], pay dntt [name], etc.
      // Better regex to handle "dntt" (4 chars) correctly
      const dnntRegex = /(?:#|\+|\@)?(?:xong\s+|đã\s+|hoàn\s+thành\s+|pay\s+|duyệt\s+|làm\s+)?(dntt|dtt|dnt)(?::|\s+cho|\s+|\s+)?\s*([^\n,.;:|/]+)/gi;
      let dnttMatch;
      while ((dnttMatch = dnntRegex.exec(content)) !== null) {
        const taskTitle = dnttMatch[2].trim();
        if (!taskTitle || taskTitle.length < 2) continue;

        const normalizedSearch = normalizeText(taskTitle);

        // Look for tasks in this project with similar title
        const taskToUpdate = allTasks.find(t => 
          t.projectId === project.id && 
          t.category === 'pre-production' && 
          (
            normalizeText(t.title).includes(normalizedSearch) ||
            normalizedSearch.includes(normalizeText(t.title))
          )
        );
        
        if (taskToUpdate) {
          try {
            const taskRef = doc(db, 'teams', MAIN_TEAM_ID, 'projects', project.id, 'tasks', taskToUpdate.id);
            await updateDoc(taskRef, { 
              dntt: true,
              updatedAt: serverTimestamp()
            });
          } catch (err) {
            console.error("Auto-update DNTT failed:", err);
          }
        }
      }
    }
  };

  const [showReportDeleteConfirm, setShowReportDeleteConfirm] = useState<{ show: boolean, reportId: string }>({ show: false, reportId: '' });

  const handleDeleteReport = async (reportId: string) => {
    if (!user || isProcessing) return;
    
    if (!isAdmin) {
      showToast('Chỉ Admin mới có quyền xóa báo cáo.', 'error');
      return;
    }

    setIsProcessing(true);
    try {
      // Find and delete linked tasks first
      const tasksQuery = query(collectionGroup(db, 'tasks'), where('sourceReportId', '==', reportId));
      const tasksSnapshot = await getDocs(tasksQuery);
      for (const taskDoc of tasksSnapshot.docs) {
        await deleteDoc(taskDoc.ref);
      }

      await deleteDoc(doc(db, 'teams', MAIN_TEAM_ID, 'reports', reportId));
      showToast('Đã xóa báo cáo và các dữ liệu liên quan thành công!');
      setShowReportDeleteConfirm({ show: false, reportId: '' });
    } catch (error) {
      handleFirestoreError(error, 'delete', `teams/${MAIN_TEAM_ID}/reports/${reportId}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExportMonthlyReport = () => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
    
    // Filter reports for the current month
    const monthlyReports = reports.filter(r => r.reportDate && r.reportDate.startsWith(monthStr));
    
    if (monthlyReports.length === 0) {
      showToast('Không có dữ liệu báo cáo trong tháng này để xuất.', 'error');
      return;
    }

    // Create CSV content
    // BOM for Excel to recognize UTF-8
    let csvContent = "\uFEFF";
    csvContent += "ID,Ngày,Người báo cáo,Nội dung,Dự án,Thời gian tạo\n";
    
    monthlyReports.forEach(report => {
      const projectName = projects.find(p => p.id === report.projectId)?.title || 'N/A';
      const row = [
        report.id,
        report.reportDate,
        report.userEmail || 'N/A',
        `"${(report.content || '').replace(/"/g, '""')}"`,
        `"${projectName.replace(/"/g, '""')}"`,
        report.createdAt?.toDate ? report.createdAt.toDate().toLocaleString('vi-VN') : 'N/A'
      ].join(",");
      csvContent += row + "\n";
    });

    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Bao_cao_thang_${month + 1}_${year}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast('Đã xuất báo cáo thành công!');
  };

  const handleAddTaskImage = async (taskId: string, imageUrl: string) => {
    if (!selectedProjectId || !imageUrl) return;
    try {
      const taskDocRef = doc(db, 'teams', MAIN_TEAM_ID, 'projects', selectedProjectId, 'tasks', taskId);
      const taskSnap = await getDoc(taskDocRef);
      if (taskSnap.exists()) {
        const currentImages = taskSnap.data().images || [];
        await updateDoc(taskDocRef, {
          images: [...currentImages, imageUrl]
        });
      }
    } catch (error) {
      handleFirestoreError(error, 'update', `teams/${MAIN_TEAM_ID}/projects/${selectedProjectId}/tasks/${taskId}`);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!user || !selectedProjectId) return;
    try {
      // Find and delete linked report first
      const reportsQuery = query(collection(db, 'teams', MAIN_TEAM_ID, 'reports'), where('relatedTaskId', '==', taskId));
      const reportsSnapshot = await getDocs(reportsQuery);
      for (const reportDoc of reportsSnapshot.docs) {
        await deleteDoc(reportDoc.ref);
      }

      await deleteDoc(doc(db, 'teams', MAIN_TEAM_ID, 'projects', selectedProjectId, 'tasks', taskId));
      showToast('Đã xóa tiến độ và báo cáo liên quan.', 'success');
    } catch (error) {
      console.error('Delete task error:', error);
      showToast('Lỗi khi xóa dữ liệu.', 'error');
    }
  };

  const handleToggleDNTT = async (taskId: string, currentVal: boolean) => {
    if (!user || !selectedProjectId || isProcessing) return;
    
    const currentUserRole = members.find(m => m.uid === user.uid)?.role;
    if (currentUserRole === 'viewer') {
      showToast('Bạn không có quyền cập nhật task.', 'error');
      return;
    }

    try {
      const taskRef = doc(db, 'teams', MAIN_TEAM_ID, 'projects', selectedProjectId, 'tasks', taskId);
      const isFinishing = !currentVal;
      
      const updateData: any = {
        dntt: isFinishing,
        updatedAt: serverTimestamp()
      };
      
      if (isFinishing) {
        updateData.completedAt = serverTimestamp();
      }
      
      await updateDoc(taskRef, updateData);

      // Automatically create a report when DNTT is toggled ON
      if (isFinishing && auth.currentUser) {
        const task = allTasks.find(t => t.id === taskId);
        if (task) {
          const projectForReport = projects.find(p => p.id === selectedProjectId);
          const currentUser = auth.currentUser;
          const userIdentifier = currentUser.email?.split('@')[0] || currentUser.displayName || 'Thành viên';
          const reportContent = `${userIdentifier} đã tick DNTT: ${task.title} (${(task.amount || 0).toLocaleString()}đ) - Dự án: ${projectForReport?.title || 'N/A'}`;
          
          try {
            await addDoc(collection(db, 'teams', MAIN_TEAM_ID, 'reports'), {
              content: `Báo cáo tự động: ${reportContent}`,
              reportDate: new Date().toISOString().split('T')[0],
              projectId: selectedProjectId,
              createdAt: serverTimestamp(),
              createdBy: currentUser.uid,
              userEmail: currentUser.email || 'N/A',
              relatedTaskId: taskId 
            });
          } catch (reportErr) {
            console.error("Auto-report failed in ToggleDNTT:", reportErr);
          }
        }
      }
    } catch (error) {
      handleFirestoreError(error, 'update', `teams/${MAIN_TEAM_ID}/projects/${selectedProjectId}/tasks/${taskId}`);
    }
  };

  const handleUpdateTaskStatus = async (taskId: string, newStatus: string) => {
    if (!user || !selectedProjectId) return;
    try {
      await setDoc(doc(db, 'teams', MAIN_TEAM_ID, 'projects', selectedProjectId, 'tasks', taskId), { 
        status: newStatus 
      }, { merge: true });
    } catch (error) {
      console.error('Update task error:', error);
    }
  };

  // Remove handleJoinTeam and handleCreateTeam as they are now automatic

  const getCategoryProgress = (category: 'photo' | 'video') => {
    return tasks
      .filter(t => t.category === category)
      .reduce((sum, task) => sum + (task.quantity || 1), 0);
  };

  // Remove getRecentDeadline function
  
  if (loading || initializingTeam) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center gap-4">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-500 text-sm animate-pulse">Đang kết nối với Team Media...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#141414] border border-[#262626] rounded-3xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-900/20">
              <LayoutDashboard size={32} />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Media Team</h1>
            <p className="text-gray-400 mt-2">Hệ thống quản lý team nội bộ</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Tên đăng nhập</label>
              <div className="relative">
                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                <input 
                  required
                  type="text" 
                  value={authForm.username}
                  onChange={e => setAuthForm({...authForm, username: e.target.value})}
                  placeholder="VD: admin, editor_01..."
                  className="w-full bg-[#0a0a0a] border border-[#333] rounded-xl pl-12 pr-4 py-3 focus:border-blue-500 focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Mật khẩu</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                <input 
                  required
                  type="password" 
                  value={authForm.password}
                  onChange={e => setAuthForm({...authForm, password: e.target.value})}
                  placeholder="••••••••"
                  className="w-full bg-[#0a0a0a] border border-[#333] rounded-xl pl-12 pr-4 py-3 focus:border-blue-500 focus:outline-none transition-colors"
                />
              </div>
            </div>

            {authError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-red-500 text-xs">
                <AlertCircle size={14} />
                {authError}
              </div>
            )}

            <button 
              disabled={isProcessing}
              type="submit"
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-bold text-sm transition-all active:scale-95 shadow-lg shadow-blue-900/20"
            >
              {isProcessing ? 'Đang xử lý...' : 'Đăng nhập'}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-[#262626] text-center">
            <p className="text-xs text-gray-500">
              Vui lòng liên hệ Admin để được cấp tài khoản.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // No team selection needed, auto-redirect to dashboard

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col lg:flex-row">
        {/* Mobile Header */}
        <header className="lg:hidden h-16 border-b border-[#262626] flex items-center justify-between px-4 sticky top-0 bg-[#0a0a0a] z-20">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <LayoutDashboard size={18} />
            </div>
            <span className="font-bold tracking-tight">MediaTeam</span>
          </div>
          <button 
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="p-2 hover:bg-[#141414] rounded-lg transition-colors"
          >
            {showMobileMenu ? <X size={24} /> : <Menu size={24} />}
          </button>
        </header>

        {/* Sidebar */}
        <aside className={`w-64 border-r border-[#262626] flex flex-col fixed inset-y-0 left-0 bg-[#0a0a0a] z-30 transform transition-transform duration-300 lg:translate-x-0 ${showMobileMenu ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="p-6 border-b border-[#262626] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <LayoutDashboard size={18} />
              </div>
              <span className="font-bold tracking-tight">MediaTeam</span>
            </div>
            <button className="lg:hidden p-2" onClick={() => setShowMobileMenu(false)}><X size={20} /></button>
          </div>
          
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            <button 
              onClick={() => { setCurrentView('dashboard'); setShowMobileMenu(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${currentView === 'dashboard' ? 'bg-blue-600/10 text-blue-500' : 'text-gray-400 hover:bg-[#141414]'}`}
            >
              <LayoutDashboard size={20} />
              Dashboard
            </button>
            <div className="space-y-1">
              <button 
                onClick={() => { setIsProjectsMenuExpanded(!isProjectsMenuExpanded); }}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-medium transition-all ${(currentView === 'projects' || currentView === 'project_detail') ? 'bg-blue-600/10 text-blue-500' : 'text-gray-400 hover:bg-[#141414]'}`}
              >
                <div className="flex items-center gap-3">
                  <FileText size={20} />
                  Projects
                </div>
                <ChevronDown size={16} className={`transition-transform ${isProjectsMenuExpanded ? 'rotate-180' : ''}`} />
              </button>
              
              {isProjectsMenuExpanded && (
                <div className="pl-11 pr-4 space-y-1 mt-1">
                  <button 
                    onClick={() => { setCurrentView('projects'); setProjectListTab('photo'); setShowMobileMenu(false); }}
                    className={`w-full flex items-center gap-2 text-left px-3 py-2 rounded-lg text-sm font-medium transition-all ${currentView === 'projects' && projectListTab === 'photo' ? 'text-blue-500 bg-blue-500/10' : 'text-gray-400 hover:text-gray-200 hover:bg-[#141414]'}`}
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                    Ảnh
                  </button>
                  <button 
                    onClick={() => { setCurrentView('projects'); setProjectListTab('video'); setShowMobileMenu(false); }}
                    className={`w-full flex items-center gap-2 text-left px-3 py-2 rounded-lg text-sm font-medium transition-all ${currentView === 'projects' && projectListTab === 'video' ? 'text-purple-500 bg-purple-500/10' : 'text-gray-400 hover:text-gray-200 hover:bg-[#141414]'}`}
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-500"></div>
                    Video
                  </button>
                  <button 
                    onClick={() => { setCurrentView('projects'); setProjectListTab('outsource'); setShowMobileMenu(false); }}
                    className={`w-full flex items-center gap-2 text-left px-3 py-2 rounded-lg text-sm font-medium transition-all ${currentView === 'projects' && projectListTab === 'outsource' ? 'text-amber-500 bg-amber-500/10' : 'text-gray-400 hover:text-gray-200 hover:bg-[#141414]'}`}
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
                    Outsource
                  </button>
                </div>
              )}
            </div>
            <button 
              onClick={() => { setCurrentView('reports'); setShowMobileMenu(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${currentView === 'reports' ? 'bg-blue-600/10 text-blue-500' : 'text-gray-400 hover:bg-[#141414]'}`}
            >
              <Clock size={20} />
              Báo cáo
            </button>
            {isAdmin && (
              <button 
                onClick={() => { setCurrentView('performance'); setShowMobileMenu(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${currentView === 'performance' ? 'bg-purple-600/10 text-purple-500' : 'text-gray-400 hover:bg-[#141414]'}`}
              >
                <BarChartIcon size={20} />
                Hiệu suất (Admin)
              </button>
            )}
            <button 
              onClick={() => { setCurrentView('settings'); setShowMobileMenu(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${currentView === 'settings' ? 'bg-blue-600/10 text-blue-500' : 'text-gray-400 hover:bg-[#141414]'}`}
            >
              <Settings size={20} />
              Cài đặt
            </button>
          </nav>

          <div className="p-4 border-t border-[#262626]">
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/20 overflow-hidden flex items-center justify-center text-blue-500 font-black">
                {currentUserMember?.avatarUrl ? (
                  <img src={currentUserMember.avatarUrl} alt="User" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  user?.email?.charAt(0).toUpperCase()
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate text-white">{currentUserMember?.username || user?.email?.split('@')[0]}</p>
                <button onClick={() => signOut(auth)} className="text-[10px] text-gray-500 hover:text-red-400 flex items-center gap-1 mt-0.5">
                  <LogOut size={10} /> Đăng xuất
                </button>
              </div>
            </div>
          </div>
        </aside>

        {/* Mobile menu overlay */}
        {showMobileMenu && (
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-20 lg:hidden"
            onClick={() => setShowMobileMenu(false)}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 lg:ml-64 overflow-y-auto p-4 md:p-8">
          <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 md:mb-12">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                {currentView === 'dashboard' && (teamData?.name || 'Media Dashboard')}
                {currentView === 'projects' && 'Quản lý Projects'}
                {currentView === 'reports' && 'Báo cáo hàng ngày'}
                {currentView === 'settings' && 'Cài đặt hệ thống'}
              </h1>
              <p className="text-xs md:text-sm text-gray-400 mt-1">Hệ thống quản lý team nội bộ</p>
            </div>
            <div className="flex items-center gap-4">
              {currentView === 'projects' && isEditor && (
                <button 
                  onClick={() => {
                    setNewProject(prev => ({
                      ...prev,
                      photoPoint: 0,
                      videoPoint: 0
                    }));
                    setShowProjectModal(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-xl text-sm font-bold transition-all active:scale-95 shadow-lg shadow-blue-900/20"
                >
                  <Plus size={18} />
                  Project Mới
                </button>
              )}
              {currentView === 'reports' && isEditor && (
                <button 
                  onClick={() => setShowReportModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-xl text-sm font-bold transition-all active:scale-95 shadow-lg shadow-blue-900/20"
                >
                  <Plus size={18} />
                  Báo cáo mới
                </button>
              )}
            </div>
          </header>

          {currentView === 'dashboard' && (
            <div className="space-y-8">
              {/* Stats Overview */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-[#141414] border border-[#262626] p-6 rounded-2xl">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-blue-500/10 text-blue-500 rounded-xl">
                      <FileText size={24} />
                    </div>
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Dự án</span>
                  </div>
                  <p className="text-3xl font-bold">{projects.length}</p>
                  <p className="text-xs text-gray-500 mt-2">Tổng số dự án hiện tại</p>
                </div>
                <div className="bg-[#141414] border border-[#262626] p-6 rounded-2xl">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-green-500/10 text-green-500 rounded-xl">
                      <CheckCircle2 size={24} />
                    </div>
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Hoàn thành</span>
                  </div>
                  <p className="text-3xl font-bold">{projects.filter(p => p.status === 'done').length}</p>
                  <p className="text-xs text-gray-500 mt-2">Dự án đã kết thúc</p>
                </div>
                <div className="bg-[#141414] border border-[#262626] p-6 rounded-2xl">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-purple-500/10 text-purple-500 rounded-xl">
                      <Clock size={24} />
                    </div>
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Báo cáo</span>
                  </div>
                  <p className="text-3xl font-bold">{dashboardReports.length}</p>
                  <p className="text-xs text-gray-500 mt-2">Tổng số báo cáo trong tháng</p>
                </div>
                <div className="bg-[#141414] border border-[#262626] p-6 rounded-2xl">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-red-500/10 text-red-500 rounded-xl">
                      <DollarSign size={24} />
                    </div>
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Chi phí tháng này</span>
                  </div>
                  <p className="text-3xl font-bold">
                    {(() => {
                      const now = new Date();
                      const currentMonth = now.getMonth(); 
                      const currentYear = now.getFullYear();
                      const projectsInMonth = projects.filter(project => {
                        const projectDate = project.createdAt?.toDate ? project.createdAt.toDate() : new Date(project.createdAt?.seconds * 1000 || Date.now());
                        return projectDate.getMonth() === currentMonth && projectDate.getFullYear() === currentYear;
                      });
                      const projectIdsInMonth = new Set(projectsInMonth.map(p => p.id));
                      const monthlyTotal = allTasks
                        .filter(task => projectIdsInMonth.has(task.projectId))
                        .reduce((sum, task) => sum + (Number(task.amount) || 0), 0);
                      return monthlyTotal.toLocaleString('vi-VN');
                    })()}
                  </p>
                  <p className="text-xs text-gray-500 mt-2">Tổng chi phí theo dự án</p>
                </div>
              </div>

              {/* Extended Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-[#141414] border border-[#262626] rounded-2xl p-6">
                  <h2 className="text-sm font-bold mb-6 uppercase tracking-widest text-gray-500">Sản lượng theo ngày ({dashboardMonth})</h2>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart 
                        data={(() => {
                          const daysInMonth = new Date(parseInt(dashboardMonth.split('-')[0]), parseInt(dashboardMonth.split('-')[1]), 0).getDate();
                          const data = [];
                          for (let i = 1; i <= daysInMonth; i++) {
                            const dateStr = `${dashboardMonth}-${String(i).padStart(2, '0')}`;
                            const dailyTasks = allTasks.filter(t => (t.reportDate || '').startsWith(dateStr));
                            data.push({
                              day: i,
                              photo: dailyTasks.filter(t => t.category === 'photo').reduce((s, t) => s + (Number(t.quantity) || 1), 0),
                              video: dailyTasks.filter(t => t.category === 'video').reduce((s, t) => s + (Number(t.quantity) || 1), 0),
                            });
                          }
                          return data;
                        })()}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                        <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill: '#666', fontSize: 10}} />
                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#666', fontSize: 10}} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#141414', border: '1px solid #262626', borderRadius: '8px' }}
                          itemStyle={{ fontSize: '12px' }}
                        />
                        <Area type="monotone" dataKey="photo" stroke="#f97316" fill="#f97316" fillOpacity={0.1} strokeWidth={2} name="Ảnh" />
                        <Area type="monotone" dataKey="video" stroke="#a855f7" fill="#a855f7" fillOpacity={0.1} strokeWidth={2} name="Video" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-[#141414] border border-[#262626] rounded-2xl p-6">
                  <h2 className="text-sm font-bold mb-6 uppercase tracking-widest text-gray-500">Đóng góp của nhân sự</h2>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={members.filter(m => m.role !== 'viewer').map(m => ({
                            name: m.username,
                            value: allTasks.filter(t => t.createdBy === m.uid && (t.reportDate || '').startsWith(dashboardMonth)).length
                          })).filter(d => d.value > 0)}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {members.filter(m => m.role !== 'viewer').map((_, index) => (
                            <Cell key={`cell-${index}`} fill={['#3b82f6', '#a855f7', '#f97316', '#22c55e', '#ef4444'][index % 5]} />
                          ))}
                        </Pie>
                        <Tooltip 
                           contentStyle={{ backgroundColor: '#141414', border: '1px solid #262626', borderRadius: '8px' }}
                        />
                        <Legend wrapperStyle={{ fontSize: '10px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Project Progress List */}
                <div className="lg:col-span-2 bg-[#141414] border border-[#262626] rounded-2xl overflow-hidden shadow-xl">
                  <div className="p-6 border-b border-[#262626] bg-[#1a1a1a]/50 flex justify-between items-center">
                    <h2 className="text-lg font-bold flex items-center gap-3 text-white">
                      <div className="w-1.5 h-6 bg-blue-500 rounded-full" />
                      Dự án đang triển khai
                    </h2>
                    <button 
                      onClick={() => setCurrentView('projects')}
                      className="text-xs text-blue-500 hover:text-blue-400 font-bold uppercase tracking-widest transition-colors flex items-center gap-1"
                    >
                      Tất cả <ChevronRight size={14} />
                    </button>
                  </div>
                  <div className="divide-y divide-[#262626]">
                    {projects.filter(p => p.status !== 'done').length === 0 ? (
                      <div className="p-16 text-center text-gray-500 italic flex flex-col items-center gap-4">
                        <FileText size={48} className="opacity-10" />
                        <p>Không có dự án nào đang thực hiện.</p>
                      </div>
                    ) : (
                      [...projects]
                        .filter(p => p.status !== 'done')
                        .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
                        .map((project) => {
                          const photoProgress = project.photoTarget > 0 
                            ? Math.min(100, Math.round((allTasks.filter(t => t.category === 'photo' && t.projectId === project.id).reduce((sum, t) => sum + (t.quantity || 1), 0) / project.photoTarget) * 100))
                            : 0;
                          const videoProgress = project.videoTarget > 0
                            ? Math.min(100, Math.round((allTasks.filter(t => t.category === 'video' && t.projectId === project.id).reduce((sum, t) => sum + (t.quantity || 1), 0) / project.videoTarget) * 100))
                            : 0;

                          // Check if near deadline
                          let isUrgent = false;
                          let daysLeft = 0;
                          const progress = Math.round((photoProgress + videoProgress) / 2);
                          
                          if (project.deadline && progress < 100) {
                            const dl = new Date(project.deadline);
                            const now = new Date();
                            const diff = dl.getTime() - now.getTime();
                            daysLeft = Math.ceil(diff / (1000 * 60 * 60 * 24));
                            if (daysLeft <= 2) isUrgent = true;
                          }

                          return (
                            <div 
                              key={project.id} 
                              className={`p-6 hover:bg-[#1a1a1a] transition-all cursor-pointer group border-l-4 ${
                                isUrgent ? 'border-l-red-500 bg-red-500/5' : 'border-l-transparent'
                              }`} 
                              onClick={() => { setSelectedProjectId(project.id); setCurrentView('project_detail'); }}
                            >
                              <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-4">
                                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner ${
                                    isUrgent ? 'bg-red-500/20 text-red-500' : 'bg-blue-500/10 text-blue-500'
                                  }`}>
                                    <FileText size={24} />
                                  </div>
                                  <div>
                                    <p className="font-bold text-lg text-gray-100 group-hover:text-blue-400 transition-colors flex items-center gap-2">
                                      {project.title}
                                      {isUrgent && <AlertCircle size={14} className="text-red-500 animate-pulse" />}
                                    </p>
                                    <div className="flex items-center gap-3 mt-1">
                                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${
                                        project.status === 'post-production' ? 'bg-blue-500/20 text-blue-400' :
                                        project.status === 'pre-production' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-gray-500/20 text-gray-400'
                                      }`}>
                                        {project.status === 'plan' ? 'Plan' : project.status === 'pre-production' ? 'Tiền kỳ' : 'Hậu kỳ'}
                                      </span>
                                      
                                      {project.deadline && (
                                        <div className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full border transition-colors ${
                                          isUrgent ? 'bg-red-600 text-white border-red-500 shadow-lg shadow-red-900/20' : 'bg-[#1a1a1a] text-gray-300 border-[#262626]'
                                        }`}>
                                          <Clock size={14} className={isUrgent ? 'text-white' : 'text-blue-500'} />
                                          <span className="text-xs font-black tracking-tight">
                                            {project.deadline} {isUrgent && `(Còn ${daysLeft} ngày)`}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className={`text-2xl font-black ${isUrgent ? 'text-red-500' : 'text-white'}`}>{Math.round((photoProgress + videoProgress)/2)}%</p>
                                  <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Trung bình</p>
                                </div>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                                    <span className="text-gray-500">Ảnh</span>
                                    <span className="text-orange-500">{photoProgress}%</span>
                                  </div>
                                  <div className="w-full h-2 bg-[#0a0a0a] rounded-full overflow-hidden border border-[#262626]">
                                    <div className="h-full bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.3)] transition-all duration-700 ease-out" style={{ width: `${photoProgress}%` }} />
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                                    <span className="text-gray-500">Video</span>
                                    <span className="text-purple-500">{videoProgress}%</span>
                                  </div>
                                  <div className="w-full h-2 bg-[#0a0a0a] rounded-full overflow-hidden border border-[#262626]">
                                    <div className="h-full bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.3)] transition-all duration-700 ease-out" style={{ width: `${videoProgress}%` }} />
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })
                    )}
                  </div>
                </div>

                <div className="space-y-8">
                  <div className="bg-[#141414] border border-[#262626] rounded-2xl p-6 shadow-xl">
                    <h2 className="text-sm font-bold mb-6 uppercase tracking-widest text-gray-500 flex items-center gap-2">
                       <BarChartIcon size={16} className="text-blue-500" /> Phân tích trạng thái
                    </h2>
                    <div className="space-y-5">
                      {[
                        { label: 'Plan', count: projects.filter(p => p.status === 'plan').length, color: 'bg-gray-500', pct: Math.round(projects.filter(p => p.status === 'plan').length/projects.length*100) || 0 },
                        { label: 'Tiền kỳ', count: projects.filter(p => p.status === 'pre-production').length, color: 'bg-yellow-500', pct: Math.round(projects.filter(p => p.status === 'pre-production').length/projects.length*100) || 0 },
                        { label: 'Hậu kỳ', count: projects.filter(p => p.status === 'post-production').length, color: 'bg-blue-500', pct: Math.round(projects.filter(p => p.status === 'post-production').length/projects.length*100) || 0 },
                        { label: 'Done', count: projects.filter(p => p.status === 'done').length, color: 'bg-green-500', pct: Math.round(projects.filter(p => p.status === 'done').length/projects.length*100) || 0 },
                      ].map((item) => (
                        <div key={item.label} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
                              <span className="text-xs font-bold text-gray-400">{item.label}</span>
                            </div>
                            <span className="text-xs font-black text-white">{item.count}</span>
                          </div>
                          <div className="w-full h-1 bg-[#0a0a0a] rounded-full overflow-hidden">
                            <div className={`h-full ${item.color} opacity-30`} style={{ width: `${item.pct}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-[#141414] border border-[#262626] rounded-2xl p-6 shadow-xl">
                    <h2 className="text-sm font-bold mb-6 uppercase tracking-widest text-gray-500 flex items-center gap-2">
                      <Clock size={16} className="text-purple-500" /> Hoạt động gần đây trong tháng
                    </h2>
                    <div className="space-y-6">
                      {dashboardReports.slice(0, 5).map((report, idx) => {
                        const reporter = getMemberData(report.createdBy || report.userEmail);
                        return (
                          <div key={report.id || idx} className="flex gap-4 group cursor-pointer" onClick={() => setSelectedReport(report)}>
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#262626] to-[#141414] border border-[#333] flex items-center justify-center text-xs font-bold text-gray-400 group-hover:text-blue-400 group-hover:border-blue-500/30 transition-all overflow-hidden">
                              {reporter?.avatarUrl ? (
                                <img src={reporter.avatarUrl} alt="avat" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              ) : (
                                report.userEmail?.charAt(0).toUpperCase() || 'U'
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex justify-between items-start">
                                <p className="text-xs font-bold text-gray-200 group-hover:text-blue-400 transition-colors truncate">{reporter?.username || report.userEmail?.split('@')[0]}</p>
                                <p className="text-[9px] text-gray-600 font-medium shrink-0">{report.reportDate}</p>
                              </div>
                              <p className="text-[10px] text-gray-500 line-clamp-2 mt-0.5 leading-relaxed">{report.content}</p>
                            </div>
                          </div>
                        );
                      })}
                      {dashboardReports.length === 0 && (
                        <p className="text-xs text-gray-500 italic text-center py-4">Chưa có hoạt động nào trong tháng này.</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Staff Performance Section - Now full width with more detail */}
                <div className="lg:col-span-3 bg-[#141414] border border-[#262626] rounded-2xl p-8 shadow-2xl">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10 pb-6 border-b border-[#262626]">
                    <div>
                      <h2 className="text-2xl font-black flex items-center gap-3 text-white tracking-tight">
                        <div className="w-2 h-8 bg-purple-600 rounded-full" />
                        Bảng vàng hiệu suất
                      </h2>
                      <p className="text-xs text-gray-500 mt-1">Thống kê chi tiết dựa trên dữ liệu báo cáo và task hoàn thành</p>
                    </div>
                    <div className="flex items-center gap-4">
                       <div className="flex items-center gap-3 bg-[#0a0a0a] border border-[#262626] rounded-2xl px-5 py-3 shadow-inner">
                        <Calendar size={18} className="text-purple-500" />
                        <input 
                          type="month" 
                          value={dashboardMonth}
                          onChange={(e) => setDashboardMonth(e.target.value)}
                          className="bg-transparent border-none text-sm font-black focus:outline-none cursor-pointer text-white"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="text-[11px] font-black text-gray-500 uppercase tracking-[0.2em] border-b border-[#262626]">
                          <th className="pb-6 pl-4">Nhân sự</th>
                          <th className="pb-6 text-center">Ảnh</th>
                          <th className="pb-6 text-center">Video</th>
                          <th className="pb-6 text-center">DNTT</th>
                          <th className="pb-6 text-center">Báo cáo</th>
                          <th className="pb-6 text-center">Hiệu suất</th>
                          <th className="pb-6 text-center">Hăng hái</th>
                          <th className="pb-6 text-right pr-4">Tổng điểm</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#262626]">
                        {[...members].filter(m => m.role !== 'viewer').sort((a, b) => {
                          const getScore = (m: any) => {
                             const tasks = allTasks.filter(t => t.createdBy === m.uid && (t.reportDate || '').startsWith(dashboardMonth) && (t.status === 'completed' || t.dntt));
                             
                             const productionPoints = tasks.reduce((sum, t) => {
                               const proj = projects.find(p => p.id === t.projectId);
                               let point = 1;
                               if (t.category === 'photo') point = proj?.photoPoint || teamData?.photoPoint || 1;
                               else if (t.category === 'video') point = proj?.videoPoint || teamData?.videoPoint || 3;
                               return sum + (point * (Number(t.quantity) || 1));
                             }, 0);
                             
                             const reportCountVal = 0; // reports do not give points
                             
                             return productionPoints + reportCountVal;
                          };
                          return getScore(b) - getScore(a);
                        }).map((member, idx) => {
                            const userTasks = allTasks.filter(t => 
                              t.createdBy === (member.uid || member.id) && 
                              (t.reportDate || '').startsWith(dashboardMonth)
                            );
                            
                            const photoCount = userTasks
                              .filter(t => t.category === 'photo' && (t.status === 'completed' || t.dntt))
                              .reduce((sum, t) => sum + (Number(t.quantity) || 1), 0);
                              
                            const videoCount = userTasks
                              .filter(t => t.category === 'video' && (t.status === 'completed' || t.dntt))
                              .reduce((sum, t) => sum + (Number(t.quantity) || 1), 0);

                            const dnttCount = userTasks
                              .filter(t => t.category === 'pre-production' && t.dntt)
                              .length;
                            
                            const reportCount = reports.filter(r => 
                              (r.createdBy === (member.uid || member.id)) && 
                              (r.reportDate || '').startsWith(dashboardMonth)
                            ).length;

                            // Calculate average deadline performance
                            const completedTasksWithDeadline = userTasks.filter(t => 
                              (t.status === 'completed' || t.dntt) && t.deadline && (t.completedAt || t.updatedAt)
                            );
                            
                            let avgDeadlineDiff = 0;
                            if (completedTasksWithDeadline.length > 0) {
                              const totalDiff = completedTasksWithDeadline.reduce((sum, t) => {
                                const dl = new Date(t.deadline);
                                const compDate = t.completedAt?.toDate ? t.completedAt.toDate() : new Date(t.completedAt?.seconds * 1000 || t.updatedAt?.seconds * 1000 || Date.now());
                                // Calculate days: dl - compDate (positive means early, negative means late)
                                const diffDays = (dl.getTime() - compDate.getTime()) / (1000 * 60 * 60 * 24);
                                return sum + diffDays;
                              }, 0);
                              avgDeadlineDiff = totalDiff / completedTasksWithDeadline.length;
                            }

                            // Calculate points based on project settings
                            const productionScore = userTasks
                              .filter(t => (t.status === 'completed' || t.dntt))
                              .reduce((sum, t) => {
                                const proj = projects.find(p => p.id === t.projectId);
                                let point = 1;
                                if (t.category === 'photo') point = proj?.photoPoint || teamData?.photoPoint || 1;
                                else if (t.category === 'video') point = proj?.videoPoint || teamData?.videoPoint || 3;
                                return sum + (point * (Number(t.quantity) || 1));
                              }, 0);

                            const score = productionScore + 0; // reports do not give points

                            return (
                              <tr key={member.uid || member.id} className="hover:bg-blue-600/5 transition-all group">
                                <td className="py-6 pl-4">
                                  <div className="flex items-center gap-4">
                                    <div className="relative">
                                      <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br transition-all flex items-center justify-center text-sm font-black border border-[#333] shadow-lg overflow-hidden ${
                                        idx === 0 ? 'from-yellow-500/20 to-orange-500/20 border-yellow-500/30 text-yellow-500' :
                                        idx === 1 ? 'from-gray-300/20 to-gray-400/20 border-gray-400/30 text-gray-300' :
                                        idx === 2 ? 'from-orange-800/20 to-orange-900/20 border-orange-900/30 text-orange-700' : 'from-[#262626] to-[#141414] text-gray-500'
                                      }`}>
                                        {member.avatarUrl ? (
                                          <img src={member.avatarUrl} alt="av" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                        ) : (
                                          member.username?.charAt(0).toUpperCase() || 'U'
                                        )}
                                      </div>
                                      {idx < 3 && (
                                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-black border border-[#262626] rounded-full flex items-center justify-center text-[10px] shadow-xl">
                                          {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}
                                        </div>
                                      )}
                                    </div>
                                    <div>
                                      <p className="text-base font-bold text-gray-100">{member.username}</p>
                                      <p className="text-[10px] text-gray-500 uppercase tracking-[0.1em] font-medium mt-0.5">{member.title || member.role}</p>
                                    </div>
                                  </div>
                                </td>
                                <td className="py-6 text-center">
                                  <div className="inline-flex flex-col items-center">
                                    <span className="text-xl font-black text-orange-500">{photoCount}</span>
                                    <span className="text-[9px] font-bold text-gray-600 uppercase tracking-widest mt-1">Ảnh</span>
                                  </div>
                                </td>
                                <td className="py-6 text-center">
                                  <div className="inline-flex flex-col items-center">
                                    <span className="text-xl font-black text-purple-500">{videoCount}</span>
                                    <span className="text-[9px] font-bold text-gray-600 uppercase tracking-widest mt-1">Video</span>
                                  </div>
                                </td>
                                <td className="py-6 text-center">
                                  <div className="inline-flex flex-col items-center">
                                    <span className="text-xl font-black text-green-500">{dnttCount}</span>
                                    <span className="text-[9px] font-bold text-gray-600 uppercase tracking-widest mt-1">DNTT</span>
                                  </div>
                                </td>
                                <td className="py-6 text-center">
                                  <div className="inline-flex flex-col items-center">
                                    <span className="text-xl font-black text-blue-500">{reportCount}</span>
                                    <span className="text-[9px] font-bold text-gray-600 uppercase tracking-widest mt-1">Báo cáo</span>
                                  </div>
                                </td>
                                <td className="py-6 text-center">
                                  <div className="inline-flex flex-col items-center">
                                    <span className={`text-sm font-black ${avgDeadlineDiff >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                      {avgDeadlineDiff >= 0 ? '+' : ''}{avgDeadlineDiff.toFixed(1)}d
                                    </span>
                                    <span className="text-[9px] font-bold text-gray-600 uppercase tracking-widest mt-1">Sớm/Muộn</span>
                                  </div>
                                </td>
                                <td className="py-6 text-center">
                                   <div className="w-16 h-1 bg-[#0a0a0a] rounded-full mx-auto overflow-hidden">
                                      <div className="h-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" style={{ width: `${Math.min(100, reportCount * 5)}%` }} />
                                   </div>
                                </td>
                                <td className="py-6 text-right pr-4">
                                  <button 
                                    onClick={() => setShowScoreDetail(member)}
                                    className="cursor-pointer text-lg font-black text-white px-4 py-1.5 rounded-xl bg-gradient-to-r from-blue-600/20 to-purple-600/20 hover:from-blue-600/30 hover:to-purple-600/30 hover:scale-105 transition-all border border-blue-500/20 hover:border-blue-500/40 inline-flex items-center gap-1"
                                    title="Xem chi tiết bảng tính điểm"
                                  >
                                    {score.toFixed(1)}
                                    <span className="text-[9px] text-blue-400 font-bold ml-1">(Chi tiết)</span>
                                  </button>
                                </td>
                              </tr>
                            );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentView === 'performance' && isAdmin && (
            <div className="space-y-8 animate-in fade-in duration-500 pb-20">
               {/* Summary Stats Card */}
               <div className="bg-[#141414] border border-[#262626] rounded-2xl p-8 shadow-2xl">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10 pb-6 border-b border-[#262626]">
                    <div>
                      <h2 className="text-2xl font-black flex items-center gap-3 text-white tracking-tight">
                        <div className="w-2 h-8 bg-purple-600 rounded-full" />
                        Phân tích hiệu suất Editor
                      </h2>
                      <p className="text-xs text-gray-400 mt-1">Sản lượng chi tiết của từng thành viên theo ngày</p>
                    </div>
                    <div className="flex items-center gap-4">
                       <div className="flex items-center gap-3 bg-[#0a0a0a] border border-[#262626] rounded-2xl px-5 py-3 shadow-inner">
                        <Calendar size={18} className="text-purple-500" />
                        <input 
                          type="month" 
                          value={dashboardMonth}
                          onChange={(e) => setDashboardMonth(e.target.value)}
                          className="bg-transparent border-none text-sm font-black focus:outline-none cursor-pointer text-white"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Individual Member Charts Grid */}
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                    {members.filter(m => m.role === 'admin' || m.role === 'editor').map((member) => {
                      const [year, month] = dashboardMonth.split('-').map(Number);
                      const daysInMonth = new Date(year, month, 0).getDate();
                      
                      const userTasks = allTasks.filter(t => 
                        (t.createdBy === (member.uid || member.id)) && 
                        (t.reportDate || '').startsWith(dashboardMonth)
                      );

                      const chartData = Array.from({ length: daysInMonth }, (_, i) => {
                        const dayStr = `${dashboardMonth}-${String(i + 1).padStart(2, '0')}`;
                        const dayTasks = userTasks.filter(t => t.reportDate === dayStr);
                        return {
                          day: i + 1,
                          photo: dayTasks.filter(t => t.category === 'photo').reduce((s, t) => s + (Number(t.quantity) || 1), 0),
                          video: dayTasks.filter(t => t.category === 'video').reduce((s, t) => s + (Number(t.quantity) || 1), 0),
                          dntt: dayTasks.filter(t => t.category === 'pre-production' && t.dntt).length
                        };
                      });

                      const totalP = chartData.reduce((acc, curr) => acc + curr.photo, 0);
                      const totalV = chartData.reduce((acc, curr) => acc + curr.video, 0);
                      const totalD = chartData.reduce((acc, curr) => acc + curr.dntt, 0);

                      const totalPoints = userTasks.reduce((sum, t) => {
                         const proj = projects.find(projItem => projItem.id === t.projectId);
                         let point = 0;
                         if (t.category === 'photo') point = proj?.photoPoint || teamData?.photoPoint || 1;
                         else if (t.category === 'video') point = proj?.videoPoint || teamData?.videoPoint || 3;
                         else if (t.category === 'pre-production' && t.dntt) point = 1;
                         else return sum;
                         return sum + (point * (t.category === 'pre-production' ? 1 : (Number(t.quantity) || 1)));
                      }, 0);

                      // KPI Calculations
                      const userProjectIds = Array.from(new Set(userTasks.map(t => t.projectId)));
                      const userProjects = projects.filter(p => userProjectIds.includes(p.id));
                      
                      // 1. Output (40%)
                      const kpiOutputTarget = member.kpiOutput || 100;
                      const outputScoreRaw = (totalPoints / kpiOutputTarget) * 100;
                      const outputKPI = outputScoreRaw;

                      // 2. Quality (40%)
                      const doneProjects = userProjects.filter(p => p.status === 'done' && p.qualityScore !== undefined);
                      const avgQuality = doneProjects.length > 0 
                        ? doneProjects.reduce((sum, p) => sum + p.qualityScore, 0) / doneProjects.length 
                        : 0;
                      const kpiQualityTarget = member.kpiQuality || 10;
                      const qualityKPI = (avgQuality / kpiQualityTarget) * 100;

                      // 3. Deadline (20%)
                      // Calculate deadline performance: Progress of project at/by deadline
                      const deadlineScores = userProjects.map(p => {
                        const projectTasks = allTasks.filter(t => t.projectId === p.id);
                        if (projectTasks.length === 0) return 10; // Default if no tasks
                        
                        // Tasks completed before or on deadline
                        const deadlineDate = p.deadline ? new Date(p.deadline) : new Date();
                        const completedByDeadline = projectTasks.filter(t => {
                          if (t.status !== 'completed' && !t.dntt) return false;
                          const compDate = t.completedAt?.toDate ? t.completedAt.toDate() : new Date(t.completedAt?.seconds * 1000 || t.updatedAt?.seconds * 1000 || Date.now());
                          return compDate <= deadlineDate;
                        });

                        // Simple progress at deadline: (Sum of current quantity / Target)
                        const photoDone = projectTasks.filter(t => t.category === 'photo' && (t.status === 'completed' || t.dntt)).reduce((s, t) => s + (Number(t.quantity) || 1), 0);
                        const videoDone = projectTasks.filter(t => t.category === 'video' && (t.status === 'completed' || t.dntt)).reduce((s, t) => s + (Number(t.quantity) || 1), 0);
                        const targetPoints = (p.photoTarget || 0) * (p.photoPoint || 1) + (p.videoTarget || 0) * (p.videoPoint || 3);
                        const currentPoints = photoDone * (p.photoPoint || 1) + videoDone * (p.videoPoint || 3);
                        
                        const progress = targetPoints > 0 ? (currentPoints / targetPoints) : 1;
                        return progress * 10;
                      });
                      
                      const avgDeadlineScore = deadlineScores.length > 0 
                        ? deadlineScores.reduce((sum, s) => sum + s, 0) / deadlineScores.length 
                        : 0;
                      const kpiDeadlineTarget = member.kpiDeadline || 10;
                      const deadlineKPI = (avgDeadlineScore / kpiDeadlineTarget) * 100;

                      const finalKPI = (outputKPI * 0.4) + (qualityKPI * 0.4) + (deadlineKPI * 0.2);

                      return (
                        <div key={member.uid || member.id} className="bg-[#0a0a0a] border border-[#262626] rounded-2xl p-6 hover:border-purple-500/30 transition-all group overflow-hidden">
                          <div className="flex justify-between items-start mb-6">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-purple-600/10 text-purple-400 flex items-center justify-center text-xs font-black border border-purple-500/20 overflow-hidden">
                                {member.avatarUrl ? (
                                  <img src={member.avatarUrl} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                ) : (
                                  member.username?.charAt(0).toUpperCase()
                                )}
                              </div>
                              <div>
                                <h4 className="text-sm font-black text-white">{member.username}</h4>
                                <p className="text-[10px] text-gray-500 font-mono">{member.email}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">KPI Tổng hợp</p>
                              <p className="text-xl font-black text-purple-500">{finalKPI.toFixed(1)}%</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-2 mb-6">
                            <div className="bg-[#141414] p-2 rounded-xl border border-[#262626] text-center">
                              <p className="text-[8px] font-bold text-gray-500 uppercase">Output (40%)</p>
                              <p className="text-sm font-black text-blue-500">{outputKPI.toFixed(0)}%</p>
                            </div>
                            <div className="bg-[#141414] p-2 rounded-xl border border-[#262626] text-center">
                              <p className="text-[8px] font-bold text-gray-500 uppercase">Quality (40%)</p>
                              <p className="text-sm font-black text-yellow-500">{qualityKPI.toFixed(0)}%</p>
                            </div>
                            <div className="bg-[#141414] p-2 rounded-xl border border-[#262626] text-center">
                              <p className="text-[8px] font-bold text-gray-500 uppercase">Deadline (20%)</p>
                              <p className="text-sm font-black text-green-500">{deadlineKPI.toFixed(0)}%</p>
                            </div>
                          </div>

                          <div className="h-[250px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                  <linearGradient id={`gradPhoto-${member.id}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                                  </linearGradient>
                                  <linearGradient id={`gradVideo-${member.id}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                                  </linearGradient>
                                  <linearGradient id={`gradDNTT-${member.id}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                                  </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#666' }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#666' }} />
                                <Tooltip 
                                  contentStyle={{ backgroundColor: '#141414', border: '1px solid #262626', borderRadius: '12px', fontSize: '10px' }}
                                  labelStyle={{ color: '#fff', fontWeight: 'bold', marginBottom: '4px' }}
                                  itemStyle={{ padding: '2px 0' }}
                                />
                                <Area 
                                  type="monotone" 
                                  dataKey="photo" 
                                  name="Ảnh"
                                  stroke="#f97316" 
                                  strokeWidth={3}
                                  fillOpacity={1} 
                                  fill={`url(#gradPhoto-${member.id})`} 
                                />
                                <Area 
                                  type="monotone" 
                                  dataKey="video" 
                                  name="Video"
                                  stroke="#a855f7" 
                                  strokeWidth={3}
                                  fillOpacity={1} 
                                  fill={`url(#gradVideo-${member.id})`} 
                                />
                                <Area 
                                  type="monotone" 
                                  dataKey="dntt" 
                                  name="DNTT"
                                  stroke="#22c55e" 
                                  strokeWidth={2}
                                  fillOpacity={1} 
                                  fill={`url(#gradDNTT-${member.id})`} 
                                />
                              </AreaChart>
                            </ResponsiveContainer>
                          </div>

                          <div className="grid grid-cols-3 gap-4 mt-6">
                            <div className="bg-[#141414] p-3 rounded-xl border border-[#262626] text-center">
                              <p className="text-[10px] font-bold text-gray-500 uppercase">Ảnh</p>
                              <p className="text-lg font-black text-orange-500">{totalP}</p>
                            </div>
                            <div className="bg-[#141414] p-3 rounded-xl border border-[#262626] text-center">
                              <p className="text-[10px] font-bold text-gray-500 uppercase">Video</p>
                              <p className="text-lg font-black text-purple-500">{totalV}</p>
                            </div>
                            <div className="bg-[#141414] p-3 rounded-xl border border-[#262626] text-center">
                              <p className="text-[10px] font-bold text-gray-500 uppercase">DNTT</p>
                              <p className="text-lg font-black text-green-500">{totalD}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Summary Table Section Below Charts */}
                  <div className="mt-12 overflow-x-auto">
                    <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-6 px-2">Bảng tổng hợp nhanh</h3>
                    <table className="w-full text-left">
                      <thead>
                        <tr className="text-[10px] font-black text-gray-500 uppercase tracking-wider border-b border-[#262626]">
                          <th className="pb-4 pl-4">Thành viên</th>
                          <th className="pb-4 text-center">Tổng Ảnh</th>
                          <th className="pb-4 text-center">Tổng Video</th>
                          <th className="pb-4 text-center">Tổng DNTT</th>
                          <th className="pb-4 text-right pr-4">Điểm trung bình</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#262626]">
                        {members.filter(m => m.role === 'admin' || m.role === 'editor').map((member) => {
                          const tasks = allTasks.filter(t => (t.createdBy === (member.uid || member.id)) && (t.reportDate || '').startsWith(dashboardMonth));
                          const p = tasks.filter(t => t.category === 'photo').reduce((s, t) => s + (Number(t.quantity) || 1), 0);
                          const v = tasks.filter(t => t.category === 'video').reduce((s, t) => s + (Number(t.quantity) || 1), 0);
                          const d = tasks.filter(t => t.category === 'pre-production' && t.dntt).length;
                          
                          const productionPoints = tasks.reduce((sum, t) => {
                            const proj = projects.find(projItem => projItem.id === t.projectId);
                            let point = 0;
                            if (t.category === 'photo') point = proj?.photoPoint || teamData?.photoPoint || 1;
                            else if (t.category === 'video') point = proj?.videoPoint || teamData?.videoPoint || 3;
                            else if (t.category === 'pre-production' && t.dntt) point = 1;
                            else return sum;
                            
                            return sum + (point * (t.category === 'pre-production' ? 1 : (Number(t.quantity) || 1)));
                          }, 0);
                          
                          const score = productionPoints;

                          return (
                        <tr key={member.uid || member.id} className="hover:bg-[#1a1a1a] transition-colors">
                              <td className="py-4 pl-4">
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-lg bg-gray-800 overflow-hidden flex items-center justify-center text-[10px] font-black border border-[#333]">
                                      {member.avatarUrl ? (
                                        <img src={member.avatarUrl} alt="m" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                      ) : (
                                        member.username?.charAt(0).toUpperCase()
                                      )}
                                  </div>
                                  <span className="text-xs font-bold">{member.username}</span>
                                </div>
                              </td>
                              <td className="py-4 text-center text-xs font-black text-orange-500">{p}</td>
                              <td className="py-4 text-center text-xs font-black text-purple-500">{v}</td>
                              <td className="py-4 text-center text-xs font-black text-green-500">{d}</td>
                              <td className="py-4 text-right pr-4 text-xs font-black text-white">{score.toFixed(1)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
               </div>
            </div>
          )}

          {currentView === 'projects' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8 pb-10 min-h-[calc(100vh-250px)] w-full">
                {[
                  { id: 'plan', label: 'Plan', color: 'gray' },
                  { id: 'pre-production', label: 'Tiền kỳ', color: 'yellow' },
                  { id: 'post-production', label: 'Hậu kỳ', color: 'blue' },
                  { id: 'done', label: 'Done', color: 'green' }
                ].map(status => (
                <div key={status.id} className="flex flex-col gap-5 h-full">
                  <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-3">
                      <div className={`w-2.5 h-2.5 rounded-full ${
                        status.id === 'done' ? 'bg-green-500' : 
                        status.id === 'post-production' ? 'bg-blue-500' :
                        status.id === 'pre-production' ? 'bg-yellow-500' : 'bg-gray-500'
                      }`} />
                      <h3 className="font-bold text-sm uppercase tracking-[0.2em] text-gray-400">{status.label}</h3>
                    </div>
                    <span className="text-xs font-bold text-gray-400 bg-[#141414] px-3 py-1 rounded-full border border-[#262626]">
                      {projects.filter(p => p.status === status.id).length}
                    </span>
                  </div>

                  <div className="flex-1 space-y-5 overflow-y-auto pr-2 custom-scrollbar">
                    {(() => {
                      const statusProjects = projects.filter(p => 
                        p.status === status.id && (
                          projectListTab === 'outsource' 
                            ? p.projectType === 'outsource' 
                            : (projectListTab === 'video' 
                                ? p.projectType === 'video' 
                                : (p.projectType === 'photo' || p.projectType === 'inhouse' || !p.projectType)
                              )
                        )
                      );
                      const displayProjects = (status.id === 'done' && !showAllDone) 
                        ? statusProjects.slice(0, 5) 
                        : statusProjects;

                      return (
                        <>
                          {displayProjects.map((project) => {
                            // Calculate progress
                            const projectTasks = allTasks.filter(t => t.projectId === project.id);
                            const photoDone = projectTasks.filter(t => t.category === 'photo').reduce((sum, t) => sum + (t.quantity || 1), 0);
                            const videoDone = projectTasks.filter(t => t.category === 'video').reduce((sum, t) => sum + (t.quantity || 1), 0);
                            const photoTarget = project.photoTarget || 0;
                            const videoTarget = project.videoTarget || 0;
                            const totalTarget = photoTarget + videoTarget;
                            const totalDone = photoDone + videoDone;
                            const progress = totalTarget > 0 ? Math.min(Math.round((totalDone / totalTarget) * 100), 100) : 0;

                            return (
                              <div 
                                key={project.id} 
                                onClick={() => {
                                  setSelectedProjectId(project.id);
                                  setCurrentView('project_detail');
                                }}
                                className={`bg-[#141414] border rounded-2xl p-6 transition-all group cursor-pointer shadow-xl relative overflow-hidden backdrop-blur-sm ${
                                  project.projectType === 'outsource'
                                    ? 'border-amber-500/20 hover:border-amber-500/60 hover:shadow-amber-500/5'
                                    : project.projectType === 'video'
                                    ? 'border-purple-500/20 hover:border-purple-500/60 hover:shadow-purple-500/5'
                                    : 'border-[#262626] hover:border-blue-500/50 hover:shadow-blue-500/5'
                                }`}
                              >
                                <div className="flex justify-between items-start mb-4">
                                  <div className="flex items-center gap-2">
                                    <p className="text-[10px] font-mono text-gray-600">#{project.id}</p>
                                    <span className={`px-2 py-0.5 text-[9px] font-bold rounded-md uppercase tracking-wider ${
                                      project.projectType === 'outsource' 
                                        ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' 
                                        : project.projectType === 'video'
                                        ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                                        : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                    }`}>
                                      {project.projectType === 'outsource' ? 'Outsource' : project.projectType === 'video' ? 'Video' : 'Ảnh'}
                                    </span>
                                  </div>
                                  <Calendar size={14} className="text-gray-600" />
                                </div>
                                <h4 className={`text-lg font-bold mb-2 transition-colors line-clamp-1 ${
                                  project.projectType === 'outsource'
                                    ? 'group-hover:text-amber-500'
                                    : project.projectType === 'video' ? 'group-hover:text-purple-500' : 'group-hover:text-blue-500'
                                }`}>{project.title}</h4>
                                <p className="text-sm text-gray-500 mb-6 line-clamp-2 leading-relaxed">{project.description || 'Không có mô tả.'}</p>
                                
                                {/* Progress Bar */}
                                <div className="space-y-3 mb-6">
                                  <div className="flex justify-between items-center text-xs font-bold">
                                    <span className="text-gray-500 uppercase tracking-wider">Tiến độ</span>
                                    <span className={progress === 100 ? 'text-green-500' : (project.projectType === 'outsource' ? 'text-amber-500' : project.projectType === 'video' ? 'text-purple-500' : 'text-blue-500')}>{progress}%</span>
                                  </div>
                                  <div className="h-2 bg-[#0a0a0a] rounded-full overflow-hidden border border-[#262626]">
                                    <div 
                                      className={`h-full transition-all duration-700 ease-out ${
                                        progress === 100 ? 'bg-green-500' : (project.projectType === 'outsource' ? 'bg-amber-500' : project.projectType === 'video' ? 'bg-purple-600' : 'bg-blue-600')
                                      }`}
                                      style={{ width: `${progress}%` }}
                                    />
                                  </div>
                                  <div className="flex justify-between text-[10px] text-gray-600 font-medium">
                                    {photoTarget > 0 ? (
                                      <span>Ảnh: <span className="text-gray-400">{photoDone}/{photoTarget}</span></span>
                                    ) : <span />}
                                    {videoTarget > 0 && (
                                      <span>Video: <span className="text-gray-400">{videoDone}/{videoTarget}</span></span>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center justify-between pt-4 border-t border-[#262626]">
                                  <div className="flex items-center gap-2 text-gray-500">
                                    <Clock size={12} />
                                    <span className="text-[11px]">{project.deadline || 'No deadline'}</span>
                                  </div>
                                  <div className={`opacity-0 group-hover:opacity-100 transition-opacity text-xs font-bold ${
                                    project.projectType === 'outsource' ? 'text-amber-500' : project.projectType === 'video' ? 'text-purple-500' : 'text-blue-500'
                                  }`}>
                                    Chi tiết →
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                          
                          {status.id === 'done' && statusProjects.length > 5 && (
                            <button 
                              onClick={() => setShowAllDone(!showAllDone)}
                              className="w-full py-3 text-xs font-bold text-gray-500 hover:text-blue-500 transition-colors border border-[#262626] rounded-xl bg-[#141414]/50"
                            >
                              {showAllDone ? 'Thu gọn' : `Xem thêm (${statusProjects.length - 5} dự án khác)`}
                            </button>
                          )}
                        </>
                      );
                    })()}
                    
                    {status.id === 'plan' && isEditor && (
                      <button 
                        onClick={() => {
                          setNewProject(prev => ({
                            ...prev,
                            photoPoint: 0,
                            videoPoint: 0
                          }));
                          setShowProjectModal(true);
                        }}
                        className="w-full py-6 border-2 border-dashed border-[#262626] rounded-2xl text-gray-600 hover:border-blue-500/50 hover:text-blue-500 transition-all flex flex-col items-center justify-center gap-3 text-sm font-bold bg-[#141414]/30"
                      >
                        <Plus size={24} />
                        Dự án mới
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            </div>
          )}

          {currentView === 'reports' && (
            <div className="space-y-6">
              {(() => {
                const nonAdminMembers = members.filter(m => m.role !== 'admin');
                return (
                  <div className="space-y-6">
                    {/* Calendar View */}
                    <div className="bg-[#141414] border border-[#262626] rounded-2xl p-6">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                        <div className="flex items-center gap-4">
                          <h2 className="text-xl font-bold flex items-center gap-3">
                            <Calendar size={24} className="text-blue-500" />
                            Tháng {viewDate.getMonth() + 1}/{viewDate.getFullYear()}
                          </h2>
                          <div className="flex gap-1 bg-[#0a0a0a] border border-[#262626] rounded-xl p-1">
                            <button 
                              onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))}
                              className="p-2 hover:bg-[#262626] rounded-lg transition-colors"
                            >
                              <ChevronLeft size={18} />
                            </button>
                            <button 
                              onClick={() => setViewDate(new Date())}
                              className="px-3 py-1 text-xs font-bold hover:bg-[#262626] rounded-lg transition-colors"
                            >
                              Hôm nay
                            </button>
                            <button 
                              onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))}
                              className="p-2 hover:bg-[#262626] rounded-lg transition-colors"
                            >
                              <ChevronRight size={18} />
                            </button>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <button 
                            onClick={handleExportMonthlyReport}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600/10 text-blue-500 rounded-xl text-sm font-bold hover:bg-blue-600/20 transition-all border border-blue-500/20"
                          >
                            <FileText size={18} />
                            Xuất báo cáo tháng (CSV)
                          </button>
                        </div>
                      </div>

                      {/* Legend */}
                      <div className="flex flex-wrap gap-6 mb-8 pb-6 border-b border-[#262626]">
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                          <div className="w-3 h-3 bg-blue-600 rounded-sm" />
                          <span>Đủ báo cáo ({nonAdminMembers.length}/{nonAdminMembers.length})</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                          <div className="w-3 h-3 bg-yellow-500 rounded-sm" />
                          <span>Thiếu báo cáo</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                          <div className="w-3 h-3 bg-[#0a0a0a] border border-[#262626] rounded-sm" />
                          <span>Chưa có báo cáo</span>
                        </div>
                      </div>

                      {/* Calendar Grid */}
                      <div className="overflow-x-auto -mx-6 px-6 md:mx-0 md:px-0">
                        <div className="min-w-[600px] md:min-w-0 grid grid-cols-7 gap-px bg-[#262626] border border-[#262626] rounded-xl overflow-hidden">
                          {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map((day, idx) => {
                            const fullDays = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
                            return (
                              <div key={day} className="bg-[#1a1a1a] text-center text-[10px] font-bold text-gray-500 uppercase py-3 tracking-widest">
                                <span className="hidden md:inline">{fullDays[idx]}</span>
                                <span className="md:hidden">{day}</span>
                              </div>
                            );
                          })}
                          
                          {(() => {
                          const year = viewDate.getFullYear();
                          const month = viewDate.getMonth();
                          const firstDay = new Date(year, month, 1).getDay();
                          const daysInMonth = new Date(year, month + 1, 0).getDate();
                          const days = [];

                          // Empty slots for previous month
                          for (let i = 0; i < firstDay; i++) {
                            days.push(<div key={`empty-${i}`} className="bg-[#0d0d0d] min-h-[120px]" />);
                          }

                          // Days of current month
                          for (let d = 1; d <= daysInMonth; d++) {
                            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                            const dayReports = reports.filter(r => r.reportDate === dateStr);
                            const reportersForDay = new Set(dayReports.map(r => r.userEmail?.toLowerCase()));
                            const nonAdminReportersCount = nonAdminMembers.filter(m => m.email && reportersForDay.has(m.email.toLowerCase())).length;
                            
                            let dayBgColor = 'bg-[#0a0a0a]';
                            let dayTextColor = 'text-gray-500';
                            let borderHighlight = 'border-[#262626]';
                            
                            if (nonAdminReportersCount > 0) {
                              if (nonAdminMembers.length > 0 && nonAdminReportersCount >= nonAdminMembers.length) {
                                dayBgColor = 'bg-blue-600/10';
                                dayTextColor = 'text-blue-400';
                                borderHighlight = 'border-blue-500/30';
                              } else {
                                dayBgColor = 'bg-yellow-500/10';
                                dayTextColor = 'text-yellow-500';
                                borderHighlight = 'border-yellow-500/30';
                              }
                            }

                            const isSelected = selectedDate === dateStr;
                            const isToday = new Date().toISOString().split('T')[0] === dateStr;

                            days.push(
                              <div
                                key={d}
                                onClick={() => setSelectedDate(dateStr)}
                                className={`min-h-[100px] md:min-h-[140px] p-2 transition-all border-t border-l ${borderHighlight} ${dayBgColor} cursor-pointer hover:bg-[#1a1a1a] group relative ${isSelected ? 'ring-2 ring-blue-500 ring-inset z-10' : ''}`}
                              >
                                <div className="flex justify-between items-start mb-2">
                                  <span className={`text-xs font-bold ${isToday ? 'bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center -mt-1 -ml-1' : dayTextColor}`}>
                                    {d}
                                  </span>
                                  {dayReports.length > 0 && (
                                    <span className="text-[9px] font-bold opacity-50">{dayReports.length} BC</span>
                                  )}
                                </div>
                                
                                <div className="space-y-1 overflow-y-auto max-h-[100px] custom-scrollbar">
                                  {dayReports.slice(0, 4).map((report) => (
                                    <div 
                                      key={report.id} 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedReport(report);
                                      }}
                                      className="bg-[#141414]/80 border border-[#262626] rounded px-1.5 py-1 text-[9px] leading-tight cursor-pointer hover:bg-blue-600/20 hover:border-blue-500/50 transition-all truncate"
                                    >
                                      <span className="font-bold text-blue-400 mr-1">{report.userEmail?.split('@')[0] || 'User'}:</span>
                                      <span className="text-gray-400">{report.content}</span>
                                    </div>
                                  ))}
                                  {dayReports.length > 4 && (
                                    <div className="text-[8px] text-gray-500 text-center font-bold italic">
                                      + {dayReports.length - 4} báo cáo khác
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          }
                          return days;
                        })()}
                        </div>
                      </div>
                    </div>

                    {/* Selected Day Detail */}
                    {selectedDate && (
                      <div className="bg-[#141414] border border-[#262626] rounded-2xl overflow-hidden">
                        <div className="p-6 border-b border-[#262626] bg-[#1a1a1a] flex justify-between items-center">
                          <h2 className="font-bold flex items-center gap-2">
                            <Clock size={18} className="text-blue-500" />
                            Chi tiết báo cáo ngày {new Date(selectedDate).toLocaleDateString('vi-VN')}
                          </h2>
                          <button 
                            onClick={() => setSelectedDate(null)}
                            className="text-xs text-gray-500 hover:text-white"
                          >
                            Đóng chi tiết
                          </button>
                        </div>
                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {(() => {
                            const dayReports = reports.filter(r => r.reportDate === selectedDate);
                            if (dayReports.length === 0) return <p className="col-span-full text-center text-gray-500 italic py-8">Không có báo cáo cho ngày này.</p>;
                            return dayReports.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)).map((report) => (
                              <div 
                                key={report.id} 
                                onClick={() => setSelectedReport(report)}
                                className="bg-[#0a0a0a] border border-[#262626] rounded-xl p-4 group cursor-pointer hover:border-blue-500/30 hover:bg-blue-600/5 transition-all"
                              >
                                <div className="flex justify-between items-start mb-3">
                                  <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-[10px] font-bold overflow-hidden">
                                      {(() => {
                                        const reporter = getMemberData(report.createdBy || report.userEmail);
                                        return reporter?.avatarUrl ? (
                                          <img src={reporter.avatarUrl} alt="av" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                        ) : (
                                          report.userEmail?.charAt(0).toUpperCase()
                                        );
                                      })()}
                                    </div>
                                    <span className="text-xs font-bold text-gray-300">
                                      {getMemberData(report.createdBy || report.userEmail)?.username || report.userEmail?.split('@')[0]}
                                    </span>
                                  </div>
                                  {isAdmin && (
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); setShowReportDeleteConfirm({ show: true, reportId: report.id }); }}
                                      className="p-1 text-gray-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  )}
                                </div>
                                <p className="text-xs text-gray-400 whitespace-pre-wrap leading-relaxed line-clamp-6">
                                  {report.content}
                                </p>
                                <div className="mt-3 pt-3 border-t border-[#262626] flex justify-between items-center text-[9px] text-gray-600">
                                   <div className="flex items-center gap-2 italic">
                                      <span className="font-mono">#{report.id.slice(-4)}</span>
                                      <span>•</span>
                                      <span>{report.createdAt?.toDate ? report.createdAt.toDate().toLocaleTimeString('vi-VN') : 'Vừa xong'}</span>
                                   </div>
                                   <span className="text-blue-500 font-bold group-hover:underline">Chi tiết →</span>
                                </div>
                              </div>
                            ));
                          })()}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          {currentView === 'project_detail' && selectedProjectId && (
            <div className="space-y-8">
              <div className="flex items-center gap-4 mb-8">
                <button 
                  onClick={() => setCurrentView('projects')}
                  className="p-2 hover:bg-[#262626] rounded-full transition-colors"
                >
                  <ChevronLeft size={24} />
                </button>
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h1 className="text-3xl font-bold tracking-tight">
                      {projects.find(p => p.id === selectedProjectId)?.title || 'Project Details'}
                    </h1>
                    {isAdmin && (
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => {
                            const p = projects.find(p => p.id === selectedProjectId);
                            if (!p) {
                              showToast('Không tìm thấy thông tin dự án.', 'error');
                              return;
                            }
                            setEditingProject(p);
                            setNewProject({
                              title: p.title || '',
                              description: p.description || '',
                              deadline: p.deadline || '',
                              status: p.status || 'plan',
                              productCount: p.productCount || 1,
                              photoTarget: p.photoTarget || 0,
                              videoTarget: p.videoTarget || 0,
                              photoPoint: p.photoPoint || 1,
                              videoPoint: p.videoPoint || 3,
                              itemStatus: p.itemStatus || 'chưa nhận',
                              projectType: p.projectType || 'inhouse'
                            });
                            setShowProjectModal(true);
                          }}
                          className="p-2 text-gray-500 hover:text-blue-500 transition-colors"
                          title="Chỉnh sửa dự án"
                        >
                          <Edit3 size={18} />
                        </button>
                        <button 
                          onClick={() => setShowProjectDeleteConfirm({ show: true, projectId: selectedProjectId })}
                          className="p-2 text-gray-500 hover:text-red-500 transition-colors"
                          title="Xóa dự án"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    )}
                  </div>
                  <p className="text-gray-400 text-sm mt-1">Chi tiết dự án và quản lý công việc</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                  {/* Tiền kì Section */}
                  <div className="bg-[#141414] border border-[#262626] rounded-2xl overflow-hidden">
                    <div className="p-6 border-b border-[#262626] flex justify-between items-center bg-[#1a1a1a]/50">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-6 rounded-full bg-blue-500" />
                        <h2 className="font-bold text-lg">Tiền kì & Chi phí</h2>
                        <span className="text-xs bg-[#262626] px-2 py-1 rounded-md text-gray-400">
                          {tasks.filter(t => t.category === 'pre-production').length}
                        </span>
                      </div>
                      <button 
                        onClick={() => {
                          setNewTask(prev => ({ ...prev, category: 'pre-production', title: '', amount: 0, reportDate: new Date().toISOString().split('T')[0] }));
                          setNewTaskImages([]);
                          setShowTaskModal(true);
                        }}
                        className="p-2 hover:bg-[#262626] rounded-xl text-blue-500 transition-colors"
                      >
                        <Plus size={20} />
                      </button>
                    </div>
                    <div className="divide-y divide-[#262626]">
                      {tasks.filter(t => t.category === 'pre-production').length === 0 ? (
                        <div className="p-8 text-center text-gray-500 text-sm italic">
                          Chưa có task nào trong mục này.
                        </div>
                      ) : (
                          tasks.filter(t => t.category === 'pre-production')
                            .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
                            .map((task) => {
                              const creator = getMemberData(task.createdBy);
                              return (
                                <div key={task.id} className="p-4 flex items-center justify-between hover:bg-[#1a1a1a] transition-colors group">
                                  <div className="flex items-center gap-4 flex-1">
                                    <div className="relative group/avatar">
                                      <div className="w-10 h-10 bg-[#0a0a0a] rounded-lg border border-[#262626] flex flex-col items-center justify-center text-[10px] font-bold text-gray-500 overflow-hidden">
                                        {creator?.avatarUrl ? (
                                          <img src={creator.avatarUrl} alt="av" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                        ) : (
                                          task.createdAt?.toDate ? (
                                            <>
                                              <span>{task.createdAt.toDate().getDate()}</span>
                                              <span className="opacity-50">T{task.createdAt.toDate().getMonth() + 1}</span>
                                            </>
                                          ) : '...'
                                        )}
                                      </div>
                                      {creator?.avatarUrl && (
                                        <div className="absolute -bottom-1 -right-1 bg-blue-600 w-3 h-3 rounded-full border-2 border-[#141414] shadow-sm scale-0 group-hover/avatar:scale-100 transition-transform" />
                                      )}
                                    </div>
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2">
                                        <p className="text-sm font-medium">{task.title}</p>
                                        <div className="flex items-center gap-2">
                                          <span className="text-[10px] font-mono text-gray-600 bg-[#0a0a0a] px-1.5 py-0.5 rounded border border-[#262626]">
                                            #{task.id}
                                          </span>
                                          {creator && (
                                            <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                                              by {creator.username}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                {task.amount > 0 && (
                                  <p className="text-xs text-green-500 font-mono mt-1">
                                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(task.amount)}
                                  </p>
                                )}
                                {task.images && task.images.length > 0 && (
                                  <div className="flex gap-1 mt-2 flex-wrap">
                                    {task.images.map((img: string, i: number) => (
                                      <img 
                                        key={i} 
                                        src={img || null} 
                                        className="w-12 h-12 rounded object-cover border border-[#262626] cursor-pointer hover:scale-110 transition-transform shadow-lg" 
                                        referrerPolicy="no-referrer" 
                                        onClick={() => window.open(img, '_blank')}
                                      />
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="flex flex-col items-center">
                                <span className="text-[10px] text-gray-500 uppercase font-black mb-1">DNTT</span>
                                <button 
                                  onClick={() => handleToggleDNTT(task.id, task.dntt)}
                                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                                    task.dntt ? 'bg-blue-600 border-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.3)]' : 'border-[#333] hover:border-gray-500 text-transparent'
                                  }`}
                                >
                                  {task.dntt && <Check size={12} strokeWidth={4} className="text-white" />}
                                </button>
                              </div>
                              <div className="flex flex-col items-end min-w-[100px]">
                                {task.deadline && (
                                  <span className={`text-[10px] font-black px-2 py-0.5 rounded border mb-1 ${
                                    new Date(task.deadline).getTime() < (task.completedAt?.toDate ? task.completedAt.toDate().getTime() : Date.now()) && !task.dntt
                                    ? 'bg-red-500/10 text-red-500 border-red-500/20'
                                    : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                  }`}>
                                    DL: {task.deadline}
                                  </span>
                                )}
                                <div className="flex gap-0.5 mt-1">
                                  {[...Array(5)].map((_, i) => (
                                    <div key={i} className={`w-1.5 h-1.5 rounded-full ${i < (task.difficulty || 1) ? 'bg-yellow-500' : 'bg-[#333]'}`} />
                                  ))}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity translate-x-2 group-hover:translate-x-0">
                                {isEditor && (
                                <>
                                  <button 
                                    onClick={() => {
                                      setEditingTask(task);
                                      setNewTask({
                                        title: task.title,
                                        category: task.category,
                                        status: task.status,
                                        amount: task.amount,
                                        reportDate: task.reportDate || new Date().toISOString().split('T')[0],
                                        dntt: task.dntt || false,
                                        deadline: task.deadline || '',
                                        difficulty: task.difficulty || 1
                                      });
                                      setNewTaskImages(task.images || []);
                                      setShowTaskModal(true);
                                    }}
                                    className="p-2 text-gray-500 hover:text-blue-500 transition-colors"
                                  >
                                    <Edit3 size={16} />
                                  </button>
                                  <button 
                                    onClick={() => handleDeleteTask(task.id)}
                                    className="p-2 text-gray-500 hover:text-red-500 transition-colors"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        );
                      })
                    )}
                    </div>
                  </div>

                  {/* Ảnh Section */}
                  {(projects.find(p => p.id === selectedProjectId)?.photoTarget || 0) > 0 && (
                  <div className="bg-[#141414] border border-[#262626] rounded-2xl overflow-hidden">
                    <div className="p-6 border-b border-[#262626] flex justify-between items-center bg-[#1a1a1a]/50">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-6 rounded-full bg-orange-500" />
                        <h2 className="font-bold text-lg">Hậu kì: Ảnh</h2>
                        <span className="text-xs bg-[#262626] px-2 py-1 rounded-md text-gray-400 flex items-center gap-2">
                          {getCategoryProgress('photo')} / {projects.find(p => p.id === selectedProjectId)?.photoTarget || 0}
                          {isEditor && (
                            <button 
                              onClick={() => {
                                const p = projects.find(p => p.id === selectedProjectId);
                                setTempProductCount(p?.photoTarget || 0);
                                setIsEditingProductCount({ show: true, field: 'photoTarget' });
                              }}
                              className="hover:text-white transition-colors"
                            >
                              <Edit3 size={12} />
                            </button>
                          )}
                        </span>
                      </div>
                      {isEditor && (
                        <button 
                          onClick={() => {
                            setEditingTask(null);
                            setNewTask({ title: '', category: 'photo', status: 'completed', amount: 0, reportDate: new Date().toISOString().split('T')[0] });
                            setQuickAddCount('');
                            setShowQuickAdd({ show: true, category: 'photo' });
                          }}
                          className="p-2 hover:bg-[#262626] rounded-xl text-orange-500 transition-colors"
                        >
                          <Plus size={20} />
                        </button>
                      )}
                    </div>
                    {isEditingProductCount.show && isEditingProductCount.field === 'photoTarget' && (
                      <div className="px-6 py-4 bg-[#1a1a1a] border-b border-[#262626] flex items-center gap-4">
                        <input 
                          type="number" 
                          value={tempProductCount}
                          onChange={e => setTempProductCount(Number(e.target.value))}
                          className="bg-[#0a0a0a] border border-[#333] rounded-lg px-3 py-1 text-sm w-24 focus:outline-none focus:border-blue-500"
                        />
                        <button 
                          onClick={() => handleUpdateTarget('photoTarget', tempProductCount)}
                          className="text-xs font-bold text-blue-500 hover:underline"
                        >
                          Lưu
                        </button>
                        <button 
                          onClick={() => setIsEditingProductCount({ show: false, field: '' })}
                          className="text-xs font-bold text-gray-500 hover:underline"
                        >
                          Hủy
                        </button>
                      </div>
                    )}
                    <div className="p-6 space-y-6">
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-gray-500">
                          <span>Tiến độ Ảnh</span>
                          <span>
                            {Math.round((getCategoryProgress('photo') / (projects.find(p => p.id === selectedProjectId)?.photoTarget || 1)) * 100)}%
                          </span>
                        </div>
                        <div className="w-full h-2 bg-[#0a0a0a] rounded-full overflow-hidden border border-[#262626]">
                          <div 
                            className="h-full bg-orange-500 transition-all duration-500"
                            style={{ width: `${Math.min(100, (getCategoryProgress('photo') / (projects.find(p => p.id === selectedProjectId)?.photoTarget || 1)) * 100)}%` }}
                          />
                        </div>
                      </div>

                      <div className="divide-y divide-[#262626] border border-[#262626] rounded-xl bg-[#0a0a0a]">
                        {tasks.filter(t => t.category === 'photo').length === 0 ? (
                          <div className="p-8 text-center text-gray-500 text-sm italic">
                            Chưa có sản phẩm ảnh nào.
                          </div>
                        ) : (
                          tasks.filter(t => t.category === 'photo').sort((a, b) => (b.reportDate || '').localeCompare(a.reportDate || '')).map((task) => {
                            const creator = getMemberData(task.createdBy);
                            return (
                              <div key={task.id} className="p-4 flex items-center justify-between hover:bg-[#1a1a1a] transition-colors group">
                                <div className="flex items-center gap-4 flex-1">
                                  <div className="relative group/avatar">
                                    <div className="w-9 h-9 rounded-lg overflow-hidden border border-[#262626] flex items-center justify-center bg-[#141414]">
                                      {creator?.avatarUrl ? (
                                        <img src={creator.avatarUrl} alt="av" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                      ) : (
                                        <span className="text-[10px] font-bold text-gray-500">
                                          {task.reportDate ? new Date(task.reportDate).getDate() : '...'}
                                        </span>
                                      )}
                                    </div>
                                    <div className="absolute -top-1 -right-1 text-[8px] bg-[#141414] border border-[#262626] px-1 rounded text-gray-500 font-black">
                                       {task.reportDate ? new Date(task.reportDate).getMonth() + 1 : ''}
                                    </div>
                                  </div>
                                  <div className="flex-1">
                                    <div className="flex items-center gap-4">
                                      <div>
                                        <div className="flex items-center gap-2">
                                          <p className="text-sm font-bold text-orange-500">{task.quantity || 1} Ảnh</p>
                                          <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-mono text-gray-600 bg-[#0a0a0a] px-1.5 py-0.5 rounded border border-[#262626]">
                                              #{task.id}
                                            </span>
                                            {creator && (
                                              <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                                                {creator.username}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-2 mt-1">
                                          {task.deadline && (
                                            <span className="text-[9px] font-black text-gray-500">DL: {task.deadline}</span>
                                          )}
                                          <div className="flex gap-0.5">
                                            {[...Array(5)].map((_, i) => (
                                              <div key={i} className={`w-1 h-1 rounded-full ${i < (task.difficulty || 1) ? 'bg-orange-500' : 'bg-[#333]'}`} />
                                            ))}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  {task.images && task.images.length > 0 && (
                                    <div className="flex gap-1 mt-2 flex-wrap">
                                      {task.images.map((img: string, i: number) => (
                                        <img 
                                          key={i} 
                                          src={img || null} 
                                          className="w-10 h-10 rounded object-cover border border-[#262626] cursor-pointer hover:scale-110 transition-transform shadow-lg" 
                                          referrerPolicy="no-referrer"
                                          onClick={() => window.open(img, '_blank')}
                                        />
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                              {isEditor && (
                                <button 
                                  onClick={() => handleDeleteTask(task.id)}
                                  className="p-2 text-gray-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <Trash2 size={16} />
                                </button>
                              )}
                            </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>
                  )}

                  {/* Video Section */}
                  {(projects.find(p => p.id === selectedProjectId)?.videoTarget || 0) > 0 && (
                  <div className="bg-[#141414] border border-[#262626] rounded-2xl overflow-hidden">
                    <div className="p-6 border-b border-[#262626] flex justify-between items-center bg-[#1a1a1a]/50">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-6 rounded-full bg-purple-500" />
                        <h2 className="font-bold text-lg">Hậu kì: Video</h2>
                        <span className="text-xs bg-[#262626] px-2 py-1 rounded-md text-gray-400 flex items-center gap-2">
                          {getCategoryProgress('video')} / {projects.find(p => p.id === selectedProjectId)?.videoTarget || 0}
                          {isEditor && (
                            <button 
                              onClick={() => {
                                const p = projects.find(p => p.id === selectedProjectId);
                                setTempProductCount(p?.videoTarget || 0);
                                setIsEditingProductCount({ show: true, field: 'videoTarget' });
                              }}
                              className="hover:text-white transition-colors"
                            >
                              <Edit3 size={12} />
                            </button>
                          )}
                        </span>
                      </div>
                      {isEditor && (
                        <button 
                          onClick={() => {
                            setEditingTask(null);
                            setNewTask({ title: '', category: 'video', status: 'completed', amount: 0, reportDate: new Date().toISOString().split('T')[0] });
                            setQuickAddCount('');
                            setShowQuickAdd({ show: true, category: 'video' });
                          }}
                          className="p-2 hover:bg-[#262626] rounded-xl text-purple-500 transition-colors"
                        >
                          <Plus size={20} />
                        </button>
                      )}
                    </div>
                    {isEditingProductCount.show && isEditingProductCount.field === 'videoTarget' && (
                      <div className="px-6 py-4 bg-[#1a1a1a] border-b border-[#262626] flex items-center gap-4">
                        <input 
                          type="number" 
                          value={tempProductCount}
                          onChange={e => setTempProductCount(Number(e.target.value))}
                          className="bg-[#0a0a0a] border border-[#333] rounded-lg px-3 py-1 text-sm w-24 focus:outline-none focus:border-blue-500"
                        />
                        <button 
                          onClick={() => handleUpdateTarget('videoTarget', tempProductCount)}
                          className="text-xs font-bold text-blue-500 hover:underline"
                        >
                          Lưu
                        </button>
                        <button 
                          onClick={() => setIsEditingProductCount({ show: false, field: '' })}
                          className="text-xs font-bold text-gray-500 hover:underline"
                        >
                          Hủy
                        </button>
                      </div>
                    )}
                    <div className="p-6 space-y-6">
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-gray-500">
                          <span>Tiến độ Video</span>
                          <span>
                            {Math.round((getCategoryProgress('video') / (projects.find(p => p.id === selectedProjectId)?.videoTarget || 1)) * 100)}%
                          </span>
                        </div>
                        <div className="w-full h-2 bg-[#0a0a0a] rounded-full overflow-hidden border border-[#262626]">
                          <div 
                            className="h-full bg-purple-500 transition-all duration-500"
                            style={{ width: `${Math.min(100, (getCategoryProgress('video') / (projects.find(p => p.id === selectedProjectId)?.videoTarget || 1)) * 100)}%` }}
                          />
                        </div>
                      </div>

                      <div className="divide-y divide-[#262626] border border-[#262626] rounded-xl bg-[#0a0a0a]">
                        {tasks.filter(t => t.category === 'video').length === 0 ? (
                          <div className="p-8 text-center text-gray-500 text-sm italic">
                            Chưa có sản phẩm video nào.
                          </div>
                        ) : (
                          tasks.filter(t => t.category === 'video').sort((a, b) => (b.reportDate || '').localeCompare(a.reportDate || '')).map((task) => {
                            const creator = getMemberData(task.createdBy);
                            return (
                              <div key={task.id} className="p-4 flex items-center justify-between hover:bg-[#1a1a1a] transition-colors group">
                                <div className="flex items-center gap-4 flex-1">
                                  <div className="relative group/avatar">
                                    <div className="w-9 h-9 rounded-lg overflow-hidden border border-[#262626] flex items-center justify-center bg-[#141414]">
                                      {creator?.avatarUrl ? (
                                        <img src={creator.avatarUrl} alt="av" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                      ) : (
                                        <span className="text-[10px] font-bold text-gray-500">
                                          {task.reportDate ? new Date(task.reportDate).getDate() : '...'}
                                        </span>
                                      )}
                                    </div>
                                    <div className="absolute -top-1 -right-1 text-[8px] bg-[#141414] border border-[#262626] px-1 rounded text-gray-500 font-black">
                                       {task.reportDate ? new Date(task.reportDate).getMonth() + 1 : ''}
                                    </div>
                                  </div>
                                  <div className="flex-1">
                                    <div className="flex items-center gap-4">
                                      <div>
                                        <div className="flex items-center gap-2">
                                          <p className="text-sm font-bold text-purple-500">{task.quantity || 1} Video</p>
                                          <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-mono text-gray-600 bg-[#0a0a0a] px-1.5 py-0.5 rounded border border-[#262626]">
                                              #{task.id}
                                            </span>
                                            {creator && (
                                              <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                                                {creator.username}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-2 mt-1">
                                          {task.deadline && (
                                            <span className="text-[9px] font-black text-gray-500">DL: {task.deadline}</span>
                                          )}
                                          <div className="flex gap-0.5">
                                            {[...Array(5)].map((_, i) => (
                                              <div key={i} className={`w-1 h-1 rounded-full ${i < (task.difficulty || 1) ? 'bg-purple-500' : 'bg-[#333]'}`} />
                                            ))}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  {task.images && task.images.length > 0 && (
                                    <div className="flex gap-1 mt-2 flex-wrap">
                                      {task.images.map((img: string, i: number) => (
                                        <img 
                                          key={i} 
                                          src={img || null} 
                                          className="w-10 h-10 rounded object-cover border border-[#262626] cursor-pointer hover:scale-110 transition-transform shadow-lg" 
                                          referrerPolicy="no-referrer"
                                          onClick={() => window.open(img, '_blank')}
                                        />
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <button 
                                onClick={() => handleDeleteTask(task.id)}
                                className="p-2 text-gray-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>
                  )}
                </div>

                <div className="space-y-6">
                  <div className="bg-[#141414] border border-[#262626] rounded-2xl p-6">
                    <h3 className="font-bold mb-4 flex items-center gap-2">
                      <FileText size={18} className="text-blue-500" />
                      Thông tin dự án
                    </h3>
                    <div className="space-y-5">
                      <div>
                        <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-2 px-1">Tình trạng hàng</p>
                        <select 
                          disabled={!isEditor}
                          value={projects.find(p => p.id === selectedProjectId)?.itemStatus || 'chưa nhận'}
                          onChange={async (e) => {
                            try {
                              const projectRef = doc(db, 'teams', MAIN_TEAM_ID, 'projects', selectedProjectId!);
                              await updateDoc(projectRef, { itemStatus: e.target.value });
                              showToast('Cập nhật tình trạng hàng thành công!');
                            } catch (error) {
                              handleFirestoreError(error, 'update', `projects/${selectedProjectId}`);
                            }
                          }}
                          className={`w-full bg-[#0a0a0a] border border-[#262626] rounded-xl px-3 py-2.5 text-xs font-bold uppercase tracking-wider focus:outline-none focus:ring-1 focus:ring-blue-500 appearance-none cursor-pointer ${
                            projects.find(p => p.id === selectedProjectId)?.itemStatus === 'đã trả' ? 'text-green-500 border-green-500/20 bg-green-500/5' :
                            projects.find(p => p.id === selectedProjectId)?.itemStatus === 'đã nhận' ? 'text-blue-500 border-blue-500/20 bg-blue-500/5' :
                            'text-gray-400 border-[#262626]'
                          }`}
                        >
                          <option value="chưa nhận">Chưa nhận</option>
                          <option value="đã nhận">Đã nhận</option>
                          <option value="đã trả">Đã trả</option>
                        </select>
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Mô tả</p>
                          {isEditor && !isEditingDescription && (
                            <button 
                              onClick={() => {
                                setTempDescription(projects.find(p => p.id === selectedProjectId)?.description || '');
                                setIsEditingDescription(true);
                              }}
                              className="text-gray-500 hover:text-blue-500 transition-colors"
                            >
                              <Edit3 size={12} />
                            </button>
                          )}
                        </div>
                        {isEditingDescription ? (
                          <div className="space-y-2">
                            <textarea 
                              value={tempDescription}
                              onChange={e => setTempDescription(e.target.value)}
                              className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 min-h-[100px]"
                              placeholder="Nhập mô tả dự án..."
                            />
                            <div className="flex justify-end gap-2">
                              <button 
                                onClick={() => setIsEditingDescription(false)}
                                className="text-xs font-bold text-gray-500 hover:underline"
                              >
                                Hủy
                              </button>
                              <button 
                                onClick={async () => {
                                  try {
                                    const projectRef = doc(db, 'teams', MAIN_TEAM_ID, 'projects', selectedProjectId!);
                                    await updateDoc(projectRef, { description: tempDescription });
                                    setIsEditingDescription(false);
                                    showToast('Đã cập nhật mô tả', 'success');
                                  } catch (error) {
                                    console.error("Error updating description:", error);
                                    showToast('Lỗi khi cập nhật', 'error');
                                  }
                                }}
                                className="text-xs font-bold text-blue-500 hover:underline"
                              >
                                Lưu
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-300 leading-relaxed">
                            {projects.find(p => p.id === selectedProjectId)?.description || 'Không có mô tả'}
                          </p>
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-1">Sản phẩm</p>
                          <p className="text-sm font-bold">{projects.find(p => p.id === selectedProjectId)?.productCount || 0} SP</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-1">Deadline</p>
                          <p className="text-sm">{projects.find(p => p.id === selectedProjectId)?.deadline || 'Chưa đặt'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-1">Loại dự án</p>
                          <span className={`inline-block px-2 py-0.5 mt-0.5 text-[10px] font-bold rounded-md uppercase tracking-wider ${
                            projects.find(p => p.id === selectedProjectId)?.projectType === 'outsource' 
                              ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' 
                              : projects.find(p => p.id === selectedProjectId)?.projectType === 'video'
                              ? 'bg-purple-500/10 text-purple-500 border border-purple-500/20'
                              : 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                          }`}>
                            {projects.find(p => p.id === selectedProjectId)?.projectType === 'outsource' ? 'Outsource' : projects.find(p => p.id === selectedProjectId)?.projectType === 'video' ? 'Video' : 'Ảnh'}
                          </span>
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-1">Trạng thái</p>
                        {isEditor ? (
                          <select 
                            value={projects.find(p => p.id === selectedProjectId)?.status || 'plan'}
                            onChange={async (e) => {
                              const newStatus = e.target.value;
                              if (newStatus === 'done') {
                                setSelectedQualityProject(projects.find(p => p.id === selectedProjectId));
                                setQualityScore(10);
                                setShowProjectQualityModal(true);
                              } else {
                                try {
                                  const projectRef = doc(db, 'teams', MAIN_TEAM_ID, 'projects', selectedProjectId!);
                                  await updateDoc(projectRef, { status: newStatus });
                                  showToast('Đã cập nhật trạng thái', 'success');
                                } catch (error) {
                                  console.error("Error updating status:", error);
                                  showToast('Lỗi khi cập nhật', 'error');
                                }
                              }
                            }}
                            className={`bg-transparent border-none p-0 text-xs font-bold uppercase focus:ring-0 cursor-pointer ${
                              projects.find(p => p.id === selectedProjectId)?.status === 'done' ? 'text-green-500' : 
                              projects.find(p => p.id === selectedProjectId)?.status === 'post-production' ? 'text-blue-500' : 
                              projects.find(p => p.id === selectedProjectId)?.status === 'pre-production' ? 'text-yellow-500' : 'text-gray-500'
                            }`}
                          >
                            <option value="plan" className="bg-[#141414] text-gray-500">Plan</option>
                            <option value="pre-production" className="bg-[#141414] text-yellow-500">Tiền kỳ</option>
                            <option value="post-production" className="bg-[#141414] text-blue-500">Hậu kỳ</option>
                            {projects.find(p => p.id === selectedProjectId)?.status === 'done' && (
                              <option value="done" className="bg-[#141414] text-green-500">Done</option>
                            )}
                          </select>
                        ) : (
                          <span className={`text-xs font-bold uppercase ${
                            projects.find(p => p.id === selectedProjectId)?.status === 'done' ? 'text-green-500' : 
                            projects.find(p => p.id === selectedProjectId)?.status === 'post-production' ? 'text-blue-500' : 
                            projects.find(p => p.id === selectedProjectId)?.status === 'pre-production' ? 'text-yellow-500' : 'text-gray-500'
                          }`}>
                            {projects.find(p => p.id === selectedProjectId)?.status === 'plan' ? 'Plan' : 
                             projects.find(p => p.id === selectedProjectId)?.status === 'pre-production' ? 'Tiền kỳ' : 
                             projects.find(p => p.id === selectedProjectId)?.status === 'post-production' ? 'Hậu kỳ' : 'Done'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#141414] border border-[#262626] rounded-2xl p-6">
                    <h3 className="font-bold mb-4 flex items-center gap-2">
                      <DollarSign size={18} className="text-green-500" />
                      Tổng chi phí
                    </h3>
                    <p className="text-2xl font-bold text-green-500 font-mono">
                      {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(
                        tasks.filter(t => t.category === 'pre-production').reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0)
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentView === 'settings' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-8">
                  <div className="bg-[#141414] border border-[#262626] rounded-2xl p-8">
                    <h2 className="text-xl font-bold mb-6">Thông tin Team</h2>
                    <div className="space-y-4">
                      <div>
                        <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Tên Team</label>
                        <p className="text-lg font-medium">{teamData?.name || 'Media Production Team'}</p>
                      </div>
                      <div>
                        <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Team ID</label>
                        <p className="text-sm font-mono text-blue-500">{MAIN_TEAM_ID}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#141414] border border-[#262626] rounded-2xl p-8">
                    <h2 className="text-xl font-bold mb-6">Tài khoản của bạn</h2>
                    <div className="flex items-center gap-4 mb-6">
                      <div className="relative group">
                        <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center text-3xl font-bold overflow-hidden border-2 border-[#262626]">
                          {(() => {
                            const currentMember = members.find(m => m.uid === user.uid || m.id === user.uid);
                            if (currentMember?.avatarUrl) {
                              return <img src={currentMember.avatarUrl} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />;
                            }
                            return user.email?.charAt(0).toUpperCase();
                          })()}
                        </div>
                        <label 
                          htmlFor="avatar-upload" 
                          className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-3xl"
                        >
                          <Camera size={24} className="text-white" />
                        </label>
                        <input 
                          id="avatar-upload"
                          type="file" 
                          className="hidden" 
                          accept="image/*"
                          onChange={handleAvatarUpload}
                          disabled={uploadingImage}
                        />
                        {uploadingImage && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-3xl">
                            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-lg font-bold">{user.email}</p>
                        <p className="text-sm text-gray-500 uppercase tracking-widest font-bold">
                          {members.find(m => m.uid === user.uid)?.role || 'Member'}
                        </p>
                        <p className="text-xs text-blue-500 mt-1">Nhấp vào ảnh để thay đổi</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => signOut(auth)}
                      className="px-6 py-3 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl text-sm font-bold transition-all"
                    >
                      Đăng xuất khỏi hệ thống
                    </button>
                  </div>

                  <div className="bg-[#141414] border border-[#262626] rounded-2xl p-8">
                    <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                      <Lock size={20} className="text-blue-500" />
                      Đổi mật khẩu
                    </h2>
                    <form onSubmit={handleChangePassword} className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Mật khẩu mới</label>
                        <input 
                          type="password" 
                          value={passwordChange.newPassword}
                          onChange={e => setPasswordChange({...passwordChange, newPassword: e.target.value})}
                          placeholder="Nhập mật khẩu mới"
                          className="w-full bg-[#0a0a0a] border border-[#262626] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Xác nhận mật khẩu mới</label>
                        <input 
                          type="password" 
                          value={passwordChange.confirmPassword}
                          onChange={e => setPasswordChange({...passwordChange, confirmPassword: e.target.value})}
                          placeholder="Xác nhận mật khẩu mới"
                          className="w-full bg-[#0a0a0a] border border-[#262626] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                        />
                      </div>
                      <button 
                        type="submit"
                        disabled={isProcessing}
                        className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white rounded-xl text-sm font-bold transition-all"
                      >
                        {isProcessing ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}
                      </button>
                    </form>
                  </div>
                </div>

                <div className="bg-[#141414] border border-[#262626] rounded-2xl overflow-hidden flex flex-col">
                  <div className="p-6 border-b border-[#262626] flex justify-between items-center">
                    <h2 className="font-bold">Quản lý thành viên</h2>
                    {isAdmin && (
                      <button 
                        onClick={() => setShowAddMemberModal(true)}
                        className="p-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition-all"
                      >
                        <UserPlus size={18} />
                      </button>
                    )}
                  </div>
                  <div className="divide-y divide-[#262626] max-h-[600px] overflow-y-auto">
                    {members.map((member) => (
                      <div key={member.id || member.uid} className="p-4 flex items-center justify-between hover:bg-[#1a1a1a] transition-colors group">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center text-sm font-bold border border-[#333] relative overflow-hidden">
                            {member.avatarUrl ? (
                              <img src={member.avatarUrl} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              member.email?.charAt(0).toUpperCase()
                            )}
                            {member.role === 'admin' && (
                              <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[#141414] z-10" title="Admin" />
                            )}
                          </div>
                          <div>
                            <button 
                              onClick={() => {
                                setSelectedKpiMember(member);
                                setKpiForms(prev => ({
                                  ...prev,
                                  [member.uid || member.id]: {
                                    output: member.kpiOutput || 100,
                                    quality: member.kpiQuality || 10,
                                    deadline: member.kpiDeadline || 10
                                  }
                                }));
                                setShowKpiModal(true);
                              }}
                              className="text-sm font-bold truncate max-w-[150px] hover:text-blue-500 transition-colors block text-left"
                            >
                              {member.username || member.email?.split('@')[0]}
                            </button>
                            <div className="flex items-center gap-2">
                              <p className="text-[10px] text-gray-500 uppercase tracking-wider">{member.role}</p>
                              {member.title && (
                                <>
                                  <span className="text-gray-700 text-[10px]">•</span>
                                  <p className="text-[10px] text-blue-500 font-medium">{member.title}</p>
                                </>
                              )}
                            </div>
                            {isAdmin && member.password && (
                              <div className="flex items-center gap-2 mt-1">
                                <Lock size={10} className="text-gray-600" />
                                <p className="text-[10px] font-mono text-gray-500">
                                  {showMemberPasswords[member.uid || member.id] ? member.password : '••••••••'}
                                </p>
                                <button 
                                  onClick={() => setShowMemberPasswords(prev => ({...prev, [member.uid || member.id]: !prev[member.uid || member.id]}))}
                                  className="p-1 px-1.5 hover:bg-white/5 rounded flex items-center gap-1 transition-colors group/eye"
                                >
                                  {showMemberPasswords[member.uid || member.id] ? (
                                    <EyeOff size={10} className="text-blue-500" />
                                  ) : (
                                    <Eye size={10} className="text-gray-600 group-hover/eye:text-blue-500" />
                                  )}
                                  <span className="text-[9px] text-gray-500 group-hover/eye:text-blue-500">
                                    {showMemberPasswords[member.uid || member.id] ? 'Ẩn' : 'Xem'}
                                  </span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {isAdmin && (
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => {
                                setEditingMember(member);
                                setMemberForm({
                                  username: member.username || member.email?.split('@')[0] || '',
                                  role: member.role || 'editor',
                                  title: member.title || ''
                                });
                                setShowMemberModal(true);
                              }}
                              className="p-1.5 text-gray-500 hover:text-blue-500"
                            >
                              <Edit3 size={14} />
                            </button>
                            {(member.uid || member.id) !== user?.uid && (
                              <button 
                                onClick={() => setShowDeleteConfirm({ show: true, memberId: member.uid || member.id })}
                                className="p-1.5 text-gray-500 hover:text-red-500"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* Add Member Modal */}
        {showAddMemberModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#141414] border border-[#262626] w-full max-w-md rounded-3xl p-8 shadow-2xl">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-bold tracking-tight">Thêm thành viên</h2>
                <button onClick={() => setShowAddMemberModal(false)} className="p-2 hover:bg-[#262626] rounded-full transition-colors">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleAddNewMember} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Tên đăng nhập</label>
                  <input 
                    required
                    type="text" 
                    value={newMemberForm.username}
                    onChange={e => setNewMemberForm({...newMemberForm, username: e.target.value})}
                    placeholder="VD: editor_01"
                    className="w-full bg-[#0a0a0a] border border-[#333] rounded-xl px-4 py-3 focus:border-blue-500 focus:outline-none transition-colors"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Mật khẩu khởi tạo</label>
                  <input 
                    required
                    type="password" 
                    value={newMemberForm.password}
                    onChange={e => setNewMemberForm({...newMemberForm, password: e.target.value})}
                    placeholder="••••••••"
                    className="w-full bg-[#0a0a0a] border border-[#333] rounded-xl px-4 py-3 focus:border-blue-500 focus:outline-none transition-colors"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Chức danh</label>
                    <input 
                      type="text" 
                      value={newMemberForm.title}
                      onChange={e => setNewMemberForm({...newMemberForm, title: e.target.value})}
                      placeholder="VD: Editor"
                      className="w-full bg-[#0a0a0a] border border-[#333] rounded-xl px-4 py-3 focus:border-blue-500 focus:outline-none transition-colors"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Vai trò</label>
                    <select 
                      value={newMemberForm.role}
                      onChange={e => setNewMemberForm({...newMemberForm, role: e.target.value as any})}
                      className="w-full bg-[#0a0a0a] border border-[#333] rounded-xl px-4 py-3 focus:border-blue-500 focus:outline-none transition-colors"
                    >
                      <option value="viewer">Viewer</option>
                      <option value="editor">Editor</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setShowAddMemberModal(false)}
                    className="flex-1 py-3 px-4 bg-transparent hover:bg-[#1f1f1f] border border-[#333] rounded-xl text-sm font-bold transition-colors"
                  >
                    Hủy
                  </button>
                  <button 
                    disabled={isProcessing}
                    type="submit"
                    className="flex-[2] py-3 px-4 bg-blue-600 hover:bg-blue-700 rounded-xl text-sm font-bold transition-all active:scale-95 shadow-lg shadow-blue-900/20"
                  >
                    {isProcessing ? 'Đang tạo...' : 'Tạo tài khoản'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        {showProjectModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#141414] border border-[#262626] w-full max-w-lg rounded-3xl p-8 shadow-2xl">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-bold tracking-tight">{editingProject ? 'Chỉnh sửa Project' : 'Tạo Project Mới'}</h2>
                <button 
                  onClick={() => {
                    setShowProjectModal(false);
                    setEditingProject(null);
                    setNewProject({ title: '', description: '', deadline: '', status: 'plan', productCount: 1, photoTarget: 0, videoTarget: 0, photoPoint: 0, videoPoint: 0, itemStatus: 'chưa nhận', projectType: 'photo' });
                  }} 
                  className="p-2 hover:bg-[#262626] rounded-full transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleCreateProject} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Tên Project</label>
                    <input 
                      required
                      type="text" 
                      value={newProject.title}
                      onChange={e => setNewProject({...newProject, title: e.target.value})}
                      placeholder="VD: TVC Quảng Cáo Shopee"
                      className="w-full bg-[#0a0a0a] border border-[#333] rounded-xl px-4 py-3 focus:border-blue-500 focus:outline-none transition-colors"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Tình trạng hàng</label>
                    <select 
                      value={newProject.itemStatus}
                      onChange={e => setNewProject({...newProject, itemStatus: e.target.value})}
                      className="w-full bg-[#0a0a0a] border border-[#333] rounded-xl px-4 py-3 focus:border-blue-500 focus:outline-none transition-colors"
                    >
                      <option value="chưa nhận">Chưa nhận</option>
                      <option value="đã nhận">Đã nhận</option>
                      <option value="đã trả">Đã trả</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Loại Project</label>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setNewProject({...newProject, projectType: 'photo'})}
                      className={`py-3 px-4 rounded-xl border text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                        newProject.projectType === 'photo'
                          ? 'bg-blue-600/10 border-blue-500 text-blue-400'
                          : 'bg-[#0a0a0a] border-[#333] text-gray-400 hover:border-[#444]'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${newProject.projectType === 'photo' ? 'bg-blue-500' : 'bg-gray-600'}`} />
                      Ảnh
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewProject({...newProject, projectType: 'video'})}
                      className={`py-3 px-4 rounded-xl border text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                        newProject.projectType === 'video'
                          ? 'bg-purple-600/10 border-purple-500 text-purple-400'
                          : 'bg-[#0a0a0a] border-[#333] text-gray-400 hover:border-[#444]'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${newProject.projectType === 'video' ? 'bg-purple-500' : 'bg-gray-600'}`} />
                      Video
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewProject({...newProject, projectType: 'outsource'})}
                      className={`py-3 px-4 rounded-xl border text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                        newProject.projectType === 'outsource'
                          ? 'bg-amber-600/10 border-amber-500 text-amber-400'
                          : 'bg-[#0a0a0a] border-[#333] text-gray-400 hover:border-[#444]'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${newProject.projectType === 'outsource' ? 'bg-amber-500' : 'bg-gray-600'}`} />
                      Outsource
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Mô tả</label>
                  <textarea 
                    value={newProject.description}
                    onChange={e => setNewProject({...newProject, description: e.target.value})}
                    placeholder="Mô tả ngắn gọn về dự án..."
                    rows={3}
                    className="w-full bg-[#0a0a0a] border border-[#333] rounded-xl px-4 py-3 focus:border-blue-500 focus:outline-none transition-colors resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Deadline</label>
                    <DatePicker
                      selected={newProject.deadline ? parseISO(newProject.deadline) : null}
                      onChange={(date: Date | null) => {
                        if (date && isValid(date)) {
                          setNewProject({...newProject, deadline: format(date, 'yyyy-MM-dd')});
                        } else {
                          setNewProject({...newProject, deadline: ''});
                        }
                      }}
                      dateFormat="dd/MM/yyyy"
                      placeholderText="Chọn ngày deadline"
                      className="custom-datepicker-input"
                      wrapperClassName="custom-datepicker-wrapper"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Trạng thái</label>
                    <select 
                      value={newProject.status}
                      onChange={e => setNewProject({...newProject, status: e.target.value})}
                      className="w-full bg-[#0a0a0a] border border-[#333] rounded-xl px-4 py-3 focus:border-blue-500 focus:outline-none transition-colors"
                    >
                      <option value="plan">Plan</option>
                      <option value="pre-production">Tiền kỳ</option>
                      <option value="post-production">Hậu kỳ</option>
                      {newProject.status === 'done' && (
                        <option value="done">Done</option>
                      )}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Sản phẩm</label>
                    <input 
                      type="number" 
                      value={newProject.productCount}
                      onChange={e => {
                        const val = Number(e.target.value);
                        setNewProject({
                          ...newProject, 
                          productCount: val,
                          photoTarget: val,
                          videoTarget: val
                        });
                      }}
                      className="w-full bg-[#0a0a0a] border border-[#333] rounded-xl px-4 py-3 focus:border-blue-500 focus:outline-none transition-colors"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Mục tiêu Ảnh</label>
                    <input 
                      type="number" 
                      value={newProject.photoTarget}
                      onChange={e => setNewProject({...newProject, photoTarget: Number(e.target.value)})}
                      className="w-full bg-[#0a0a0a] border border-[#333] rounded-xl px-4 py-3 focus:border-blue-500 focus:outline-none transition-colors"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Mục tiêu Video</label>
                    <input 
                      type="number" 
                      value={newProject.videoTarget}
                      onChange={e => setNewProject({...newProject, videoTarget: Number(e.target.value)})}
                      className="w-full bg-[#0a0a0a] border border-[#333] rounded-xl px-4 py-3 focus:border-blue-500 focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-gray-500 text-yellow-500">Điểm mỗi Ảnh</label>
                    <input 
                      type="number" 
                      step="any"
                      value={newProject.photoPoint}
                      onChange={e => setNewProject({...newProject, photoPoint: Number(e.target.value)})}
                      className="w-full bg-[#0a0a0a] border border-yellow-500/30 rounded-xl px-4 py-3 focus:border-yellow-500 focus:outline-none transition-colors text-yellow-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-gray-500 text-blue-500">Điểm mỗi Video</label>
                    <input 
                      type="number" 
                      step="any"
                      value={newProject.videoPoint}
                      onChange={e => setNewProject({...newProject, videoPoint: Number(e.target.value)})}
                      className="w-full bg-[#0a0a0a] border border-blue-500/30 rounded-xl px-4 py-3 focus:border-blue-500 focus:outline-none transition-colors text-blue-500"
                    />
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <button 
                    type="button"
                    onClick={() => {
                      setShowProjectModal(false);
                      setEditingProject(null);
                      setNewProject({ title: '', description: '', deadline: '', status: 'plan', productCount: 1, photoTarget: 0, videoTarget: 0, photoPoint: 0, videoPoint: 0, itemStatus: 'chưa nhận', projectType: 'photo' });
                    }}
                    className="flex-1 py-3 px-4 bg-transparent hover:bg-[#1f1f1f] border border-[#333] rounded-xl text-sm font-bold transition-colors"
                  >
                    Hủy
                  </button>
                  <button 
                    disabled={isProcessing}
                    type="submit"
                    className="flex-[2] py-3 px-4 bg-blue-600 hover:bg-blue-700 rounded-xl text-sm font-bold transition-all active:scale-95 shadow-lg shadow-blue-900/20"
                  >
                    {isProcessing ? 'Đang xử lý...' : (editingProject ? 'Cập nhật Project' : 'Tạo Project')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        {/* Quick Add Progress Modal */}
        {showQuickAdd.show && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#141414] border border-[#262626] w-full max-w-md rounded-3xl overflow-hidden shadow-2xl">
              <div className="p-6 border-b border-[#262626] flex justify-between items-center bg-[#1a1a1a]/50">
                <h2 className="text-xl font-bold">Cập nhật tiến độ {showQuickAdd.category === 'photo' ? 'Ảnh' : 'Video'}</h2>
                <button onClick={() => { setShowQuickAdd({show: false, category: 'photo'}); setQuickAddImages([]); }} className="p-2 hover:bg-[#262626] rounded-full">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleAddDailyProgress} className="p-6 space-y-6">
                <div className="space-y-6">
                  <div className="flex items-center gap-4 bg-[#0a0a0a] border border-[#262626] rounded-2xl p-4">
                    <Calendar className="text-gray-500 shrink-0" size={20} />
                    <DatePicker
                      selected={quickAddDate ? parseISO(quickAddDate) : null}
                      onChange={(date: Date | null) => {
                        if (date && isValid(date)) {
                          setQuickAddDate(format(date, 'yyyy-MM-dd'));
                        } else {
                          setQuickAddDate('');
                        }
                      }}
                      dateFormat="dd/MM/yyyy"
                      className="bg-transparent w-full focus:outline-none text-sm font-bold cursor-pointer text-white"
                      wrapperClassName="w-full"
                    />
                  </div>

                  <div className="bg-[#0a0a0a] border border-[#262626] rounded-2xl p-6 flex flex-col items-center gap-4">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Số lượng hoàn thành</p>
                    <div className="w-full">
                      <input 
                        type="number" 
                        value={quickAddCount}
                        onChange={e => {
                          const val = e.target.value;
                          if (val === '') {
                            setQuickAddCount('');
                          } else {
                            setQuickAddCount(Math.max(1, Number(val)));
                          }
                        }}
                        className="w-full bg-[#141414] border border-[#333] rounded-xl py-4 text-3xl font-bold text-center focus:border-blue-500 focus:outline-none transition-colors"
                        placeholder="Nhập số lượng..."
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Ảnh minh chứng</label>
                    <div className="grid grid-cols-4 gap-2">
                      {quickAddImages.map((img, idx) => (
                        <div key={idx} className="aspect-square rounded-lg overflow-hidden border border-[#262626] relative group">
                          <img src={img || null} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          <button 
                            type="button"
                            onClick={() => setQuickAddImages(prev => prev.filter((_, i) => i !== idx))}
                            className="absolute top-1 right-1 bg-red-500 rounded-full p-1 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X size={10} />
                          </button>
                        </div>
                      ))}
                      <label 
                        htmlFor="quick-add-file-upload"
                        className="aspect-square rounded-lg border-2 border-dashed border-[#262626] flex flex-col items-center justify-center text-gray-500 hover:border-blue-500 hover:text-blue-500 transition-all cursor-pointer relative"
                      >
                        {uploadingImage ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500" />
                        ) : (
                          <div className="pointer-events-none">
                            <Plus size={18} />
                          </div>
                        )}
                        <input 
                          id="quick-add-file-upload"
                          type="file" 
                          accept="image/*" 
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                          onChange={async (e) => {
                             const file = e.target.files?.[0];
                             if (!file) return;
                             
                             // Reset input value
                             e.target.value = '';
                             
                             setUploadingImage(true);
                             try {
                               const url = await uploadImageToStorage(file, 'quick_add');
                               setQuickAddImages(prev => [...prev, url]);
                               showToast('Tải ảnh lên thành công!', 'success');
                             } catch (error: any) {
                               showToast(`Lỗi: ${error.message || 'Lỗi không xác định'}.`, 'error');
                             } finally {
                               setUploadingImage(false);
                             }
                           }}
                        />
                      </label>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  <button 
                    disabled={isProcessing}
                    type="submit"
                    className={`w-full py-4 rounded-2xl font-bold text-lg transition-all shadow-lg ${
                      showQuickAdd.category === 'photo' 
                      ? 'bg-orange-500 hover:bg-orange-600 shadow-orange-500/20' 
                      : 'bg-purple-500 hover:bg-purple-600 shadow-purple-500/20'
                    } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {isProcessing ? 'Đang cập nhật...' : 'Xác nhận'}
                  </button>
                  <p className="text-[10px] text-center text-gray-500 uppercase font-bold tracking-widest">
                    Tiến độ: {getCategoryProgress(showQuickAdd.category)} / {projects.find(p => p.id === selectedProjectId)?.productCount || 0}
                  </p>
                </div>
              </form>
            </div>
          </div>
        )}
        {/* Task Modal */}
        {showTaskModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#141414] border border-[#262626] w-full max-w-md rounded-3xl p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-bold tracking-tight">{editingTask ? 'Chỉnh sửa Task' : 'Thêm Task Mới'}</h2>
                <button onClick={() => { setShowTaskModal(false); setEditingTask(null); setNewTaskImages([]); }} className="p-2 hover:bg-[#262626] rounded-full transition-colors">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleCreateTask} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Tên Task / Sản phẩm</label>
                  <input 
                    required
                    type="text" 
                    value={newTask.title}
                    onChange={e => setNewTask({...newTask, title: e.target.value})}
                    placeholder={newTask.category === 'photo' ? "VD: Ảnh sản phẩm 1" : newTask.category === 'video' ? "VD: Video review 1" : "VD: Quay phim hiện trường"}
                    className="w-full bg-[#0a0a0a] border border-[#333] rounded-xl px-4 py-3 focus:border-blue-500 focus:outline-none transition-colors"
                  />
                </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Ngày báo cáo</label>
                      <DatePicker
                        selected={newTask.reportDate ? parseISO(newTask.reportDate) : null}
                        onChange={(date: Date | null) => {
                          if (date && isValid(date)) {
                            setNewTask({...newTask, reportDate: format(date, 'yyyy-MM-dd')});
                          } else {
                            setNewTask({...newTask, reportDate: ''});
                          }
                        }}
                        dateFormat="dd/MM/yyyy"
                        className="custom-datepicker-input"
                        wrapperClassName="width-full"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Deadline</label>
                      <DatePicker
                        selected={newTask.deadline ? parseISO(newTask.deadline) : null}
                        onChange={(date: Date | null) => {
                          if (date && isValid(date)) {
                            setNewTask({...newTask, deadline: format(date, 'yyyy-MM-dd')});
                          } else {
                            setNewTask({...newTask, deadline: ''});
                          }
                        }}
                        dateFormat="dd/MM/yyyy"
                        placeholderText="Chọn deadline..."
                        className="custom-datepicker-input"
                        wrapperClassName="width-full"
                      />
                    </div>
                  </div>

                  {newTask.category !== 'pre-production' && (
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Độ khó ({newTask.difficulty} sao)</label>
                      <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setNewTask({...newTask, difficulty: star})}
                            className={`flex-1 py-3 rounded-xl border transition-all text-sm font-bold ${
                              newTask.difficulty === star 
                              ? 'bg-blue-600 border-blue-600 shadow-lg shadow-blue-900/20 text-white' 
                              : 'bg-[#0a0a0a] border-[#333] text-gray-500 hover:border-blue-500'
                            }`}
                          >
                            {star}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                {newTask.category === 'pre-production' && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Chi phí (VND)</label>
                    <input 
                      type="text" 
                      value={formatNumberInput(newTask.amount)}
                      onChange={e => setNewTask({...newTask, amount: parseNumberInput(e.target.value)})}
                      className="w-full bg-[#0a0a0a] border border-[#333] rounded-xl px-4 py-3 focus:border-blue-500 focus:outline-none transition-colors font-mono text-left"
                      placeholder="0"
                    />
                    <div 
                      onClick={() => setNewTask({...newTask, dntt: !newTask.dntt})}
                      className="flex items-center gap-3 p-3 bg-[#0a0a0a] border border-[#333] rounded-xl mt-2 cursor-pointer hover:bg-white/5 transition-colors group"
                    >
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${newTask.dntt ? 'bg-blue-600 border-blue-600' : 'border-[#333] group-hover:border-[#444]'}`}>
                        {newTask.dntt && <Check size={14} className="text-white" strokeWidth={4} />}
                      </div>
                      <label className="text-sm font-bold text-gray-400 cursor-pointer flex-1">Đề nghị thanh toán (DNTT)</label>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Ảnh đính kèm</label>
                  <div className="grid grid-cols-3 gap-2">
                    {/* Images in taskImages state */}
                    {newTaskImages.map((img: string, idx: number) => (
                      <div key={idx} className="aspect-square rounded-lg overflow-hidden border border-[#262626] relative group">
                        <img src={img || null} alt="task" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        <button 
                          type="button"
                          onClick={() => setNewTaskImages(prev => prev.filter((_, i) => i !== idx))}
                          className="absolute top-1 right-1 bg-red-500 rounded-full p-1 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X size={10} />
                        </button>
                      </div>
                    ))}
                    
                    <label 
                      htmlFor="task-file-upload"
                      className="aspect-square rounded-lg border-2 border-dashed border-[#262626] flex flex-col items-center justify-center text-gray-500 hover:border-blue-500 hover:text-blue-500 transition-all cursor-pointer relative"
                    >
                      {uploadingImage ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500" />
                      ) : (
                        <div className="flex flex-col items-center pointer-events-none">
                          <Plus size={20} />
                          <span className="text-[10px] mt-1 font-bold">Tải ảnh</span>
                        </div>
                      )}
                      <input 
                        id="task-file-upload"
                        type="file" 
                        accept="image/*" 
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                        onChange={handleFileUpload}
                        disabled={uploadingImage}
                      />
                    </label>
                    
                    <button 
                      type="button"
                      onClick={() => {
                        const url = prompt('Nhập URL ảnh:');
                        if (url) {
                          setNewTaskImages(prev => [...prev, url]);
                        }
                      }}
                      className="aspect-square rounded-lg border-2 border-dashed border-[#262626] flex flex-col items-center justify-center text-gray-500 hover:border-blue-500 hover:text-blue-500 transition-all"
                    >
                      <Camera size={20} />
                      <span className="text-[10px] mt-1 font-bold">URL ảnh</span>
                    </button>
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <button 
                    type="button"
                    onClick={() => { setShowTaskModal(false); setEditingTask(null); }}
                    className="flex-1 py-3 px-4 bg-transparent hover:bg-[#1f1f1f] border border-[#333] rounded-xl text-sm font-bold transition-colors"
                  >
                    Hủy
                  </button>
                  <button 
                    type="submit"
                    disabled={isProcessing}
                    className="flex-[2] py-3 px-4 bg-blue-600 hover:bg-blue-700 rounded-xl text-sm font-bold transition-all active:scale-95 shadow-lg shadow-blue-900/20 disabled:opacity-50"
                  >
                    {editingTask ? 'Lưu thay đổi' : 'Thêm Task'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        {/* Member Modal */}
        {showMemberModal && editingMember && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#141414] border border-[#262626] w-full max-w-md rounded-3xl p-8 shadow-2xl">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">Phân quyền</h2>
                  <p className="text-xs text-gray-500 mt-1">{editingMember.email}</p>
                </div>
                <button onClick={() => { setShowMemberModal(false); setEditingMember(null); }} className="p-2 hover:bg-[#262626] rounded-full transition-colors">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleUpdateMember} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Tên hiển thị</label>
                  <input 
                    type="text" 
                    value={memberForm.username}
                    onChange={e => setMemberForm({...memberForm, username: e.target.value})}
                    placeholder="Tên thành viên..."
                    className="w-full bg-[#0a0a0a] border border-[#262626] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Chức danh / Vị trí</label>
                  <input 
                    type="text" 
                    value={memberForm.title}
                    onChange={e => setMemberForm({...memberForm, title: e.target.value})}
                    placeholder="VD: Photographer, Video Editor..."
                    className="w-full bg-[#0a0a0a] border border-[#262626] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Vai trò hệ thống</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['admin', 'editor', 'viewer'] as const).map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setMemberForm({...memberForm, role: r})}
                        className={`py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all ${
                          memberForm.role === r 
                          ? 'bg-blue-500/10 border-blue-500 text-blue-500' 
                          : 'bg-transparent border-[#262626] text-gray-500 hover:border-gray-700'
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-gray-500 mt-2 italic">
                    * Admin: Toàn quyền. Editor: Thêm/sửa task. Viewer: Chỉ xem.
                  </p>
                </div>

                <div className="flex gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => { setShowMemberModal(false); setEditingMember(null); }}
                    className="flex-1 py-3 px-4 bg-transparent hover:bg-[#1f1f1f] border border-[#333] rounded-xl text-sm font-bold transition-colors"
                  >
                    Hủy
                  </button>
                  <button 
                    type="submit"
                    disabled={isProcessing}
                    className="flex-[2] py-3 px-4 bg-blue-600 hover:bg-blue-700 rounded-xl text-sm font-bold transition-all active:scale-95 shadow-lg shadow-blue-900/20 disabled:opacity-50"
                  >
                    {isProcessing ? 'Đang lưu...' : 'Lưu thay đổi'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Report Modal */}
        {showReportModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#141414] border border-[#262626] w-full max-w-lg rounded-3xl p-8 shadow-2xl">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">Báo cáo hàng ngày</h2>
                  <p className="text-xs text-gray-500 mt-1">Ghi nhận hoạt động trong ngày</p>
                </div>
                <button onClick={() => setShowReportModal(false)} className="p-2 hover:bg-[#262626] rounded-full transition-colors">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleCreateReport} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Ngày báo cáo</label>
                    <div className="flex items-center gap-4 bg-[#0a0a0a] border border-[#262626] rounded-xl p-3">
                      <Calendar className="text-gray-500" size={18} />
                      <DatePicker
                        selected={newReport.reportDate ? parseISO(newReport.reportDate) : null}
                        onChange={(date: Date | null) => {
                          if (date && isValid(date)) {
                            setNewReport({...newReport, reportDate: format(date, 'yyyy-MM-dd')});
                          } else {
                            setNewReport({...newReport, reportDate: ''});
                          }
                        }}
                        dateFormat="dd/MM/yyyy"
                        className="bg-transparent w-full focus:outline-none text-sm font-bold text-white"
                        wrapperClassName="w-full"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Chọn Project (Tùy chọn)</label>
                    <select 
                      value={newReport.projectId}
                      onChange={e => setNewReport({...newReport, projectId: e.target.value})}
                      className="w-full bg-[#0a0a0a] border border-[#262626] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                    >
                      <option value="">-- Tự động nhận diện --</option>
                      {projects.map(p => (
                        <option key={p.id} value={p.id}>{p.title}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Nội dung báo cáo</label>
                  <textarea 
                    required
                    rows={6}
                    value={newReport.content}
                    onChange={e => setNewReport({...newReport, content: e.target.value})}
                    placeholder="Mô tả các công việc đã thực hiện, kết quả đạt được, khó khăn vướng mắc..."
                    className="w-full bg-[#0a0a0a] border border-[#262626] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-colors resize-none"
                  />
                </div>

                <div className="bg-blue-500/5 border border-blue-500/10 rounded-xl p-4 space-y-2">
                  <p className="text-[10px] text-blue-400 leading-relaxed font-bold flex items-center gap-1">
                    <CheckCircle2 size={10} /> Mẹo tự động hóa:
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <p className="text-[10px] text-blue-400/80 leading-relaxed italic">
                      • <strong>dntt [tên phí]</strong>: tự tick DNTT<br/>
                      • <strong>xong [số] ảnh</strong>: cập nhật tiến độ
                    </p>
                    <p className="text-[10px] text-blue-400/80 leading-relaxed italic">
                      • <strong>#dntt [tên phí]</strong>: tiện dụng hơn<br/>
                      • <strong>[số] phím xong</strong>: nhanh gọn
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => setShowReportModal(false)}
                    className="flex-1 py-3 px-4 bg-transparent hover:bg-[#1f1f1f] border border-[#333] rounded-xl text-sm font-bold transition-colors"
                  >
                    Hủy
                  </button>
                  <button 
                    type="submit"
                    disabled={isProcessing}
                    className="flex-[2] py-3 px-4 bg-blue-600 hover:bg-blue-700 rounded-xl text-sm font-bold transition-all active:scale-95 shadow-lg shadow-blue-900/20 disabled:opacity-50"
                  >
                    {isProcessing ? 'Đang gửi...' : 'Gửi báo cáo'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        {/* Toast Notification */}
        {toast.show && (
          <div className={`fixed bottom-8 left-4 right-4 md:left-auto md:right-8 md:w-auto z-[100] px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300 ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
            <div className="shrink-0">
              {toast.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
            </div>
            <p className="font-bold text-sm text-white">{toast.message}</p>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm.show && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-[#141414] border border-[#262626] w-full max-w-sm rounded-3xl p-8 shadow-2xl text-center">
              <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 size={32} />
              </div>
              <h3 className="text-xl font-bold mb-2">Xác nhận xóa</h3>
              <p className="text-gray-400 text-sm mb-8">Bạn có chắc chắn muốn xóa thành viên này khỏi team? Hành động này không thể hoàn tác.</p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowDeleteConfirm({ show: false, memberId: '' })}
                  className="flex-1 py-3 px-4 bg-[#262626] hover:bg-[#333] rounded-xl text-sm font-bold transition-colors"
                >
                  Hủy
                </button>
                <button 
                  onClick={() => handleDeleteMember(showDeleteConfirm.memberId)}
                  disabled={isProcessing}
                  className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-700 rounded-xl text-sm font-bold transition-colors"
                >
                  {isProcessing ? 'Đang xóa...' : 'Xóa ngay'}
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Project Delete Confirmation Modal */}
        {showProjectDeleteConfirm.show && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-[#141414] border border-[#262626] w-full max-w-sm rounded-3xl p-8 shadow-2xl text-center">
              <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 size={32} />
              </div>
              <h3 className="text-xl font-bold mb-2">Xác nhận xóa Project</h3>
              <p className="text-gray-400 text-sm mb-8">Bạn có chắc chắn muốn xóa Project này và toàn bộ dữ liệu liên quan? Hành động này không thể hoàn tác.</p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowProjectDeleteConfirm({ show: false, projectId: '' })}
                  className="flex-1 py-3 px-4 bg-[#262626] hover:bg-[#333] rounded-xl text-sm font-bold transition-colors"
                >
                  Hủy
                </button>
                <button 
                  onClick={() => handleDeleteProject(showProjectDeleteConfirm.projectId)}
                  disabled={isProcessing}
                  className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-700 rounded-xl text-sm font-bold transition-colors"
                >
                  {isProcessing ? 'Đang xóa...' : 'Xóa ngay'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Report Delete Confirmation Modal */}
        {showReportDeleteConfirm.show && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-[#141414] border border-[#262626] w-full max-w-sm rounded-3xl p-8 shadow-2xl text-center">
              <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 size={32} />
              </div>
              <h3 className="text-xl font-bold mb-2">Xác nhận xóa báo cáo</h3>
              <p className="text-gray-400 text-sm mb-8">Bạn có chắc chắn muốn xóa báo cáo này? Hành động này không thể hoàn tác.</p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowReportDeleteConfirm({ show: false, reportId: '' })}
                  className="flex-1 py-3 px-4 bg-[#262626] hover:bg-[#333] rounded-xl text-sm font-bold transition-colors"
                >
                  Hủy
                </button>
                <button 
                  onClick={() => handleDeleteReport(showReportDeleteConfirm.reportId)}
                  disabled={isProcessing}
                  className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-700 rounded-xl text-sm font-bold transition-colors"
                >
                  {isProcessing ? 'Đang xóa...' : 'Xóa ngay'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Report Detail Modal */}
        {selectedReport && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
            <div className="bg-[#141414] border border-[#262626] rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="p-6 border-b border-[#262626] flex justify-between items-center bg-[#1a1a1a]/50">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <FileText size={20} className="text-blue-500" />
                  Chi tiết báo cáo
                </h3>
                <button 
                  onClick={() => setSelectedReport(null)}
                  className="p-2 hover:bg-[#262626] rounded-xl text-gray-500 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-8 space-y-8">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-[#333] flex items-center justify-center text-lg font-black text-blue-400">
                    {selectedReport.userEmail?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div>
                     <p className="text-lg font-bold text-white">{selectedReport.userEmail?.split('@')[0] || 'Unknown User'}</p>
                     <p className="text-xs text-gray-500 font-medium">{selectedReport.reportDate}</p>
                  </div>
                </div>

                <div className="bg-[#0a0a0a] border border-[#262626] rounded-2xl p-6">
                  <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{selectedReport.content}</p>
                </div>

                {(() => {
                  const project = projects.find(p => p.id === selectedReport.projectId);
                  if (!project) return (
                    <div className="pt-4 border-t border-[#262626]">
                      <p className="text-xs text-gray-500 italic">Dự án không tồn tại hoặc đã bị xóa.</p>
                    </div>
                  );

                  const photoProgress = project.photoTarget > 0 
                    ? Math.min(100, Math.round((allTasks.filter(t => t.category === 'photo' && t.projectId === project.id).reduce((sum, t) => sum + (t.quantity || 1), 0) / project.photoTarget) * 100))
                    : 0;
                  const videoProgress = project.videoTarget > 0
                    ? Math.min(100, Math.round((allTasks.filter(t => t.category === 'video' && t.projectId === project.id).reduce((sum, t) => sum + (t.quantity || 1), 0) / project.videoTarget) * 100))
                    : 0;

                  return (
                    <div className="space-y-6 pt-4 border-t border-[#262626]">
                      <h4 className="text-xs font-bold uppercase tracking-widest text-gray-500">Tiến độ dự án: {project.title}</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="space-y-2">
                           <div className="flex justify-between text-[10px] font-bold">
                             <span className="text-gray-500 uppercase tracking-widest">Ảnh</span>
                             <span className="text-orange-500">{photoProgress}%</span>
                           </div>
                           <div className="w-full h-2 bg-[#0a0a0a] rounded-full overflow-hidden">
                             <div className="h-full bg-orange-500 transition-all duration-700" style={{ width: `${photoProgress}%` }} />
                           </div>
                        </div>
                        <div className="space-y-2">
                           <div className="flex justify-between text-[10px] font-bold">
                             <span className="text-gray-500 uppercase tracking-widest">Video</span>
                             <span className="text-purple-500">{videoProgress}%</span>
                           </div>
                           <div className="w-full h-2 bg-[#0a0a0a] rounded-full overflow-hidden">
                             <div className="h-full bg-purple-500 transition-all duration-700" style={{ width: `${videoProgress}%` }} />
                           </div>
                        </div>
                      </div>
                      <button 
                        onClick={() => {
                          setSelectedProjectId(project.id);
                          setCurrentView('project_detail');
                          setSelectedReport(null);
                        }}
                        className="w-full py-3 bg-[#262626] hover:bg-[#333] text-white text-xs font-bold rounded-xl transition-all border border-[#333]"
                      >
                        Đi đến chi tiết dự án
                      </button>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        {/* Score Breakdown Detail Modal */}
        {showScoreDetail && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[150] flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-[#141414] border border-[#262626] w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden my-8">
              {/* Header */}
              <div className="p-6 border-b border-[#262626] flex justify-between items-center bg-[#1a1a1a]/50">
                <div>
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <CheckCircle2 size={20} className="text-blue-500" />
                    Chi tiết bảng tính điểm
                  </h2>
                  <p className="text-xs text-gray-500 mt-1">
                    Nhân sự: <span className="text-blue-400 font-bold">{showScoreDetail.username || showScoreDetail.email?.split('@')[0]}</span> • Tháng: <span className="text-blue-400 font-bold">{dashboardMonth}</span>
                  </p>
                </div>
                <button 
                  onClick={() => setShowScoreDetail(null)} 
                  className="p-2 hover:bg-[#262626] rounded-full transition-colors cursor-pointer text-gray-400 hover:text-white"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Content Grid */}
              <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                {(() => {
                  const m = showScoreDetail;
                  const userTasksAll = allTasks.filter(t => 
                    t.createdBy === (m.uid || m.id) && 
                    (t.reportDate || '').startsWith(dashboardMonth)
                  );
                  const userTasks = userTasksAll.filter(t => t.status === 'completed' || t.dntt);
                  
                  const userReports = reports.filter(r => 
                    r.createdBy === (m.uid || m.id) && 
                    (r.reportDate || '').startsWith(dashboardMonth)
                  );

                  let calculatedProduction = 0;
                  const productionList = userTasks.map(t => {
                    const proj = projects.find(p => p.id === t.projectId);
                    let point = 1;
                    let isCustomProjectPoint = false;
                    
                    if (t.category === 'photo') {
                      if (proj?.photoPoint !== undefined) {
                        point = proj.photoPoint;
                        isCustomProjectPoint = true;
                      } else if (teamData?.photoPoint !== undefined) {
                        point = teamData.photoPoint;
                      } else {
                        point = 1;
                      }
                    } else if (t.category === 'video') {
                      if (proj?.videoPoint !== undefined) {
                        point = proj.videoPoint;
                        isCustomProjectPoint = true;
                      } else if (teamData?.videoPoint !== undefined) {
                        point = teamData.videoPoint;
                      } else {
                        point = 3;
                      }
                    } else if (t.category === 'pre-production' && t.dntt) {
                      point = 1;
                    } else {
                      point = 0;
                    }
                    
                    const qty = Number(t.quantity) || 1;
                    const subtotal = t.category === 'pre-production' ? point : point * qty;
                    calculatedProduction += subtotal;

                    return {
                      ...t,
                      projTitle: proj?.title || 'Dự án không tồn tại/Đã xóa',
                      pointWeight: point,
                      isCustom: isCustomProjectPoint,
                      qty,
                      subtotal
                    };
                  });

                  const reportPoints = 0; // Reports do not count for points anymore
                  const totalScore = calculatedProduction + reportPoints;

                  return (
                    <div className="space-y-6">
                      {/* Section 1: Production Works */}
                      <div>
                        <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-2">
                          <Check size={16} className="text-orange-500" />
                          Sản lượng công việc hoàn thành ({productionList.length})
                        </h3>
                        {productionList.length === 0 ? (
                          <div className="p-4 rounded-xl bg-[#1a1a1a]/40 border border-[#262626] text-center text-xs text-gray-500 italic">
                            Chưa ghi nhận sản lượng hoàn thành nào trong tháng này.
                          </div>
                        ) : (
                          <div className="border border-[#262626] rounded-2xl overflow-hidden bg-[#0c0c0c]">
                            <div className="overflow-x-auto">
                              <table className="w-full text-left border-collapse">
                                <thead>
                                  <tr className="bg-[#1f1f1f]/50 border-b border-[#262626] text-[10px] uppercase tracking-wider font-bold text-gray-400">
                                    <th className="py-3 px-4">Ngày</th>
                                    <th className="py-3 px-4">Dự án</th>
                                    <th className="py-3 px-4">Công việc</th>
                                    <th className="py-3 px-4">Phân loại</th>
                                    <th className="py-3 px-4 text-center">Số lượng</th>
                                    <th className="py-3 px-4 text-center">Đơn giá (Điểm)</th>
                                    <th className="py-3 px-4 text-right">Tổng điểm</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-[#262626] text-xs">
                                  {productionList.map((item, idx) => (
                                    <tr key={item.id || idx} className="hover:bg-white/5 transition-colors">
                                      <td className="py-3 px-4 font-mono text-[11px] text-gray-500">{item.reportDate}</td>
                                      <td className="py-3 px-4 font-bold text-gray-300">
                                        {item.projTitle}
                                      </td>
                                      <td className="py-3 px-4 text-gray-400">{item.title}</td>
                                      <td className="py-3 px-4">
                                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                                          item.category === 'photo' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' :
                                          item.category === 'video' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                                          'bg-green-500/10 text-green-400 border border-green-500/20'
                                        }`}>
                                          {item.category === 'photo' ? 'Ảnh' : item.category === 'video' ? 'Video' : 'DNTT'}
                                        </span>
                                      </td>
                                      <td className="py-3 px-4 text-center font-bold text-white">{item.qty}</td>
                                      <td className="py-3 px-4 text-center">
                                        <div className="flex items-center justify-center gap-1 font-bold">
                                          <span>{item.pointWeight}</span>
                                          {item.isCustom && (
                                            <span className="text-[9px] font-mono px-1 py-0.5 bg-yellow-500/10 text-yellow-500 rounded border border-yellow-500/20" title="Điểm riêng của Dự án">Dự án</span>
                                          )}
                                        </div>
                                      </td>
                                      <td className="py-3 px-4 text-right font-black text-gray-200">
                                        {item.subtotal.toFixed(2)}
                                      </td>
                                    </tr>
                                  ))}
                                  <tr className="bg-[#1a1a1a]/30 font-bold border-t border-[#333]">
                                    <td colSpan={6} className="py-3 px-4 text-right text-gray-400 uppercase tracking-wider text-[10px]">Cộng điểm sản lượng:</td>
                                    <td className="py-3 px-4 text-right font-black text-orange-500 text-sm">{calculatedProduction.toFixed(2)}</td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Section 2: Reports info list */}
                      <div>
                        <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-2">
                          <FileText size={16} className="text-blue-500" />
                          Báo cáo hàng ngày hoạt động ({userReports.length})
                        </h3>
                        {userReports.length === 0 ? (
                          <div className="p-4 rounded-xl bg-[#1a1a1a]/40 border border-[#262626] text-center text-xs text-gray-500 italic">
                            Chưa ghi nhận báo cáo nào trong tháng này.
                          </div>
                        ) : (
                          <div className="border border-[#262626] rounded-2xl overflow-hidden bg-[#0c0c0c]">
                            <div className="max-h-[250px] overflow-y-auto">
                              <table className="w-full text-left border-collapse">
                                <thead>
                                  <tr className="bg-[#1f1f1f]/50 border-b border-[#262626] text-[10px] uppercase tracking-wider font-bold text-gray-400 sticky top-0 z-10">
                                    <th className="py-3 px-4 w-28">Ngày</th>
                                    <th className="py-3 px-4">Nội dung báo cáo</th>
                                    <th className="py-3 px-4 text-right w-28">Điểm cộng</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-[#262626] text-xs">
                                  {userReports.map((r, idx) => (
                                    <tr key={r.id || idx} className="hover:bg-white/5 transition-colors">
                                      <td className="py-3 px-4 font-mono text-[11px] text-gray-500">{r.reportDate}</td>
                                      <td className="py-3 px-4 text-gray-300 italic max-w-sm truncate" title={r.content}>{r.content}</td>
                                      <td className="py-3 px-4 text-right font-bold text-blue-400">+0</td>
                                    </tr>
                                  ))}
                                  <tr className="bg-[#1a1a1a]/30 font-bold border-t border-[#333]">
                                    <td colSpan={2} className="py-3 px-4 text-right text-gray-400 uppercase tracking-wider text-[10px]">Cộng điểm báo cáo:</td>
                                    <td className="py-3 px-4 text-right font-black text-blue-500 text-sm">{reportPoints.toFixed(2)}</td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Summary calculations card */}
                      <div className="p-5 bg-gradient-to-r from-blue-900/10 to-purple-900/10 border border-blue-500/20 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="space-y-1 text-center md:text-left">
                          <h4 className="text-xs font-bold uppercase tracking-widest text-blue-400">Công thức tổng điểm tháng</h4>
                          <p className="text-sm font-black text-white flex flex-wrap items-center justify-center md:justify-start gap-1">
                            <span>Sản lượng ({calculatedProduction.toFixed(1)}đ)</span>
                            <span className="text-gray-500">+</span>
                            <span>Báo cáo ({reportPoints.toFixed(1)}đ)</span>
                            <span className="text-gray-500">=</span>
                            <span className="px-2.5 py-0.5 rounded bg-blue-600/20 border border-blue-500/30 text-blue-400 font-bold">{totalScore.toFixed(1)}đ</span>
                          </p>
                        </div>
                        <div className="text-center md:text-right">
                          <p className="text-[10px] text-gray-500 tracking-wider uppercase font-bold">Tổng điểm chung kết</p>
                          <p className="text-3xl font-black text-white">{totalScore.toFixed(1)} <span className="text-xs text-gray-400 font-normal">ĐIỂM</span></p>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-[#262626] flex justify-end bg-[#1a1a1a]/30">
                <button 
                  onClick={() => setShowScoreDetail(null)}
                  className="py-2.5 px-6 bg-blue-600 hover:bg-blue-700 transition-colors rounded-xl text-xs font-bold text-white shadow-lg shadow-blue-950/40"
                >
                  Đóng chi tiết
                </button>
              </div>
            </div>
          </div>
        )}

        {/* KPI Settings Modal */}
        {showKpiModal && selectedKpiMember && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[120] flex items-center justify-center p-4">
            <div className="bg-[#141414] border border-[#262626] w-full max-w-md rounded-3xl p-8 shadow-2xl">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">Thiết lập KPI</h2>
                  <p className="text-xs text-gray-500 mt-1">Thành viên: <span className="text-blue-500">{selectedKpiMember.username || selectedKpiMember.email?.split('@')[0]}</span></p>
                </div>
                <button onClick={() => setShowKpiModal(false)} className="p-2 hover:bg-[#262626] rounded-full transition-colors">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSaveKpi} className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-gray-400">KPI Output (Điểm/Tháng)</label>
                    <input 
                      required
                      type="number" 
                      value={kpiForms[selectedKpiMember.uid || selectedKpiMember.id]?.output || 100}
                      onChange={e => setKpiForms(prev => ({
                        ...prev, 
                        [selectedKpiMember.uid || selectedKpiMember.id]: {
                          ...prev[selectedKpiMember.uid || selectedKpiMember.id],
                          output: Number(e.target.value)
                        }
                      }))}
                      className="w-full bg-[#0a0a0a] border border-[#333] rounded-xl px-4 py-3 focus:border-blue-500 focus:outline-none transition-colors"
                      placeholder="VD: 100"
                    />
                    <p className="text-[10px] text-gray-600 italic">* Tổng số điểm từ các project hoàn thành trong tháng.</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-gray-400">KPI Chất lượng (Thang điểm 10)</label>
                    <input 
                      required
                      type="number" 
                      min="1" max="10"
                      value={kpiForms[selectedKpiMember.uid || selectedKpiMember.id]?.quality || 10}
                      onChange={e => setKpiForms(prev => ({
                        ...prev, 
                        [selectedKpiMember.uid || selectedKpiMember.id]: {
                          ...prev[selectedKpiMember.uid || selectedKpiMember.id],
                          quality: Number(e.target.value)
                        }
                      }))}
                      className="w-full bg-[#0a0a0a] border border-[#333] rounded-xl px-4 py-3 focus:border-blue-500 focus:outline-none transition-colors"
                    />
                    <p className="text-[10px] text-gray-600 italic">* Điểm đánh giá chất lượng trung bình của các project.</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-gray-400">KPI Deadline (Thang điểm 10)</label>
                    <input 
                      required
                      type="number" 
                      min="1" max="10"
                      value={kpiForms[selectedKpiMember.uid || selectedKpiMember.id]?.deadline || 10}
                      onChange={e => setKpiForms(prev => ({
                        ...prev, 
                        [selectedKpiMember.uid || selectedKpiMember.id]: {
                          ...prev[selectedKpiMember.uid || selectedKpiMember.id],
                          deadline: Number(e.target.value)
                        }
                      }))}
                      className="w-full bg-[#0a0a0a] border border-[#333] rounded-xl px-4 py-3 focus:border-blue-500 focus:outline-none transition-colors"
                    />
                    <p className="text-[10px] text-gray-600 italic">* Điểm trung bình tiến độ project khi đến hạn deadline.</p>
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setShowKpiModal(false)}
                    className="flex-1 py-3 px-4 bg-[#262626] hover:bg-[#333] rounded-xl text-sm font-bold transition-colors"
                  >
                    Hủy
                  </button>
                  <button 
                    disabled={isProcessing}
                    type="submit"
                    className="flex-[2] py-3 px-4 bg-purple-600 hover:bg-purple-700 rounded-xl text-sm font-bold transition-all active:scale-95 shadow-lg shadow-purple-900/20"
                  >
                    {isProcessing ? 'Đang lưu...' : 'Lưu KPI'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Project Quality Rating Modal */}
        {showProjectQualityModal && selectedQualityProject && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[130] flex items-center justify-center p-4">
            <div className="bg-[#141414] border border-[#262626] w-full max-w-md rounded-3xl p-8 shadow-2xl">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight text-green-500">Hoàn thành Project</h2>
                  <p className="text-xs text-gray-500 mt-1">Dự án: <span className="text-blue-500">{selectedQualityProject.title}</span></p>
                </div>
                <button onClick={() => setShowProjectQualityModal(false)} className="p-2 hover:bg-[#262626] rounded-full transition-colors">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSaveProjectQuality} className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-4">
                    <label className="text-sm font-bold uppercase tracking-widest text-gray-400 text-center block">Đánh giá chất lượng (1 - 10)</label>
                    <div className="flex justify-center gap-1">
                      {[...Array(10)].map((_, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setQualityScore(i + 1)}
                          className={`w-8 h-8 rounded-lg font-bold text-sm transition-all ${
                            qualityScore >= i + 1 ? 'bg-yellow-500 text-black scale-110 shadow-lg shadow-yellow-500/20' : 'bg-[#262626] text-gray-500 hover:bg-[#333]'
                          }`}
                        >
                          {i + 1}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <button 
                    type="button"
                    onClick={() => {
                      setShowProjectQualityModal(false);
                      setSelectedQualityProject(null);
                    }}
                    className="flex-1 py-3 px-4 bg-[#262626] hover:bg-[#333] rounded-xl text-sm font-bold transition-colors"
                  >
                    Hủy
                  </button>
                  <button 
                    disabled={isProcessing}
                    type="submit"
                    className="flex-[2] py-3 px-4 bg-green-600 hover:bg-green-700 rounded-xl text-sm font-bold transition-all active:scale-95 shadow-lg shadow-green-900/20"
                  >
                    {isProcessing ? 'Đang cập nhật...' : 'Xác nhận hoàn thành'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
  );
}
