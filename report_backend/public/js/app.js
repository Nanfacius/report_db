new Vue({
    el: '#app',
    data: {
        currentPage: 'search',
        isLoggedIn: false,
        loginForm: {
            username: '',
            password: ''
        },
        loginError: '',
        reports: [],
        editingReport: {
            id: null,
            date: '',
            institution: '',
            title: '',
            field1: '',
            field2: '',
            content: '',
            file: null,
            url: ''
        },
        showUploadForm: false,
        searchQuery: '',
        selectedInstitution: '',
        selectedField1: '',
        selectedField2: '',
        startDate: '',
        endDate: '',
        institutions: [],
        field1Options: [],
        field2Options: [],
        searchResults: [],
        currentPageNum: 1,
        pageSize: 5,
        loading: false,
        apiBaseUrl: '/api', // 根据实际后端地址修改
        token: localStorage.getItem('token') || '',
        notification: {
            show: false,
            message: '',
            type: 'info'
        },
        batchUploads: [],
        batchProgress: 0,
        batchErrorFiles: [],
        batchSuccessCount: 0
    },
    computed: {
    totalPages() {
        return Math.ceil(this.searchResults.length / this.pageSize);
    },
    paginatedResults() {
        const start = (this.currentPageNum - 1) * this.pageSize;
        const end = start + this.pageSize;
        return this.searchResults.slice(start, end);
    }
    },
    created() {
    // 检查token是否存在
    if (this.token) {
        this.isLoggedIn = true;
    }
    
    // 加载筛选选项
    this.loadFilterOptions();
    
    // 初始搜索
    this.searchReports();
    },
    methods: {
    showNotification(message, type = 'info') {
        this.notification.message = message;
        this.notification.type = type;
        this.notification.show = true;
        
        setTimeout(() => {
        this.notification.show = false;
        }, 3000);
    },
    
    checkAuth() {
        if (this.isLoggedIn) {
        this.currentPage = 'manage';
        this.loadReports();
        } else {
        this.currentPage = 'login';
        }
    },
    
    async login() {
        try {
        const response = await axios.post(`${this.apiBaseUrl}/auth/login`, this.loginForm);
        
        if (response.data.token) {
            this.token = response.data.token;
            localStorage.setItem('token', this.token);
            this.isLoggedIn = true;
            this.currentPage = 'manage';
            this.loginError = '';
            this.loadReports();
            this.showNotification('登录成功', 'success');
        }
        } catch (error) {
        this.loginError = '用户名或密码错误';
        this.showNotification('登录失败，请检查用户名和密码', 'error');
        }
    },
    
    logout() {
        localStorage.removeItem('token');
        this.token = '';
        this.isLoggedIn = false;
        this.currentPage = 'search';
        this.showNotification('您已成功退出登录', 'info');
    },
    
    async loadReports() {
        this.loading = true;
        try {
        const response = await axios.get(`${this.apiBaseUrl}/reports`, {
            headers: { Authorization: `Bearer ${this.token}` }
        });
        this.reports = response.data;
        this.loading = false;
        } catch (error) {
        console.error('加载研报失败:', error);
        this.showNotification('加载研报失败', 'error');
        this.loading = false;
        }
    },
    
    async loadFilterOptions() {
        try {
        const response = await axios.get(`${this.apiBaseUrl}/reports/search?limit=1000`);
        const reports = response.data;
        
        // 提取机构列表
        this.institutions = [...new Set(reports.map(r => r.institution))].filter(i => i);
        
        // 提取领域1列表
        this.field1Options = [...new Set(reports.map(r => r.field1))].filter(f => f);
        // 提取领域2列表
        this.field2Options = [...new Set(reports.map(r => r.field2))].filter(f => f);
        } catch (error) {
        console.error('加载筛选选项失败:', error);
        }
    },
    
    async saveReport() {
        if (this.editingReport.id) {
        // 更新现有研报
        try {
            await axios.put(
            `${this.apiBaseUrl}/reports/${this.editingReport.id}`,
            this.editingReport,
            { headers: { Authorization: `Bearer ${this.token}` } }
            );
            
            this.showNotification('研报更新成功', 'success');
            this.loadReports();
            this.resetForm();
            this.showUploadForm = false;
        } catch (error) {
            console.error('更新研报失败:', error);
            this.showNotification('研报更新失败', 'error');
        }
        } else {
        // 创建新研报
        if (!this.editingReport.file) {
            this.showNotification('请选择PDF文件', 'error');
            return;
        }
        
        const formData = new FormData();
        formData.append('pdf', this.editingReport.file);
        formData.append('date', this.editingReport.date);
        formData.append('institution', this.editingReport.institution);
        formData.append('title', this.editingReport.title);
        formData.append('field1', this.editingReport.field1);
        formData.append('field2', this.editingReport.field2);
        formData.append('content', this.editingReport.content);
        
        try {
            const response = await axios.post(
            `${this.apiBaseUrl}/reports`,
            formData,
            {
                headers: {
                Authorization: `Bearer ${this.token}`,
                'Content-Type': 'multipart/form-data'
                }
            }
            );
            
            this.showNotification('研报创建成功', 'success');
            this.loadReports();
            this.resetForm();
            this.showUploadForm = false;
        } catch (error) {
            console.error('创建研报失败:', error);
            this.showNotification('研报创建失败', 'error');
        }
        }
    },
    
    editReport(report) {
        this.editingReport = { ...report };
        this.showUploadForm = true;
    },
    
    cancelEdit() {
        this.resetForm();
        this.showUploadForm = false;
    },
    
    resetForm() {
        this.editingReport = {
        id: null,
        date: '',
        institution: '',
        title: '',
        field1: '',
        field2: '',
        content: '',
        file: null,
        url: ''
        };
        if (this.$refs.fileInput) {
        this.$refs.fileInput.value = '';
        }
    },
    
    handleFileUpload(event) {
        this.editingReport.file = event.target.files[0];
        
        // 自动填充逻辑
        if (this.editingReport.file) {
            const filename = this.editingReport.file.name;
            
            // 匹配 YYYYmmdd-机构-标题.pdf 格式
            const pattern = /^(\d{4})(\d{2})(\d{2})-(.*?)-(.*)\.pdf$/i;
            const match = filename.match(pattern);
            
            if (match) {
                // 解析日期部分 (YYYY-MM-DD格式)
                const year = match[1];
                const month = match[2];
                const day = match[3];
                this.editingReport.date = `${year}-${month}-${day}`;
                
                // 解析机构
                this.editingReport.institution = match[4];
                
                // 解析标题（保留原标题中的短横线）
                this.editingReport.title = match[5];
            } else {
                // 文件名不符合规范时，尝试提取标题
                const titlePart = filename.replace(/\.pdf$/i, '');
                this.editingReport.title = titlePart;
            }
        }
    },
    
    confirmDelete(report) {
        if (confirm(`确定要删除研报 "${report.title}" 吗？`)) {
        this.deleteReport(report);
        }
    },
    
    async deleteReport(report) {
        try {
        await axios.delete(
            `${this.apiBaseUrl}/reports/${report.id}`,
            { headers: { Authorization: `Bearer ${this.token}` } }
        );
        
        this.showNotification('研报已删除', 'success');
        this.loadReports();
        } catch (error) {
        console.error('删除研报失败:', error);
        this.showNotification('删除研报失败', 'error');
        }
    },
    
    async searchReports() {
        this.loading = true;
        try {
        const params = {
            query: this.searchQuery,
            institution: this.selectedInstitution,
            field1: this.selectedField1,
            field2: this.selectedField2,
            startDate: this.startDate,
            endDate: this.endDate
        };
        
        const response = await axios.get(`${this.apiBaseUrl}/reports/search`, { params });
        this.searchResults = response.data;
        this.currentPageNum = 1;
        this.loading = false;
        } catch (error) {
        console.error('搜索研报失败:', error);
        this.showNotification('搜索研报失败', 'error');
        this.loading = false;
        }
    },
    
    downloadReport(report) {
        // 创建隐藏的下载链接
        const link = document.createElement('a');
        link.href = `${this.apiBaseUrl.replace('/api', '')}${report.url}`;
        link.download = report.title + '.pdf';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    },
    readReport(report) {
          // 在新标签页打开PDF
          window.open(report.url, '_blank');
          this.showNotification(`正在打开: ${report.title}`, 'info');
        },
    viewReportDetails(report) {
        alert(`研报详情: ${report.title}\n\n机构: ${report.institution}\n日期: ${this.formatDate(report.date)}\n\n摘要:\n${report.content}`);
    },
    
    formatDate(dateString) {
        const date = new Date(dateString);
        return `${date.getFullYear()}年${(date.getMonth() + 1).toString().padStart(2, '0')}月${date.getDate().toString().padStart(2, '0')}日`;
    },

    // 批量文件上传处理
  handleBatchFileUpload(event) {
    const files = Array.from(event.target.files);
    const validFiles = [];
    const invalidFiles = [];
    
    files.forEach(file => {
      const filename = file.name;
      const pattern = /^(\d{4})(\d{2})(\d{2})-(.*?)-(.*)\.pdf$/i;
      const match = filename.match(pattern);
      
      if (match) {
        validFiles.push({
          file,
          filename,
          date: `${match[1]}-${match[2]}-${match[3]}`,
          institution: match[4],
          title: match[5],
          valid: true
        });
      } else {
        invalidFiles.push({
          file,
          filename,
          reason: '文件名格式不正确'
        });
      }
    });
    
    this.batchUploads = validFiles;
    this.batchErrorFiles = invalidFiles;
    this.batchProgress = 0;
    this.batchSuccessCount = 0;
    
    // 如果有无效文件显示警告
    if (invalidFiles.length > 0) {
      const invalidNames = invalidFiles.map(f => f.filename).join(', ');
      this.showNotification(`${invalidFiles.length} 个文件格式无效: ${invalidNames}`, 'warning');
    }
    
    // 自动触发批量上传
    if (validFiles.length > 0) {
      this.$refs.fileInput.value = ''; // 清空单个文件选择
      this.processBatchUpload();
    }
  },
  
  // 批量处理上传
  async processBatchUpload() {
    for (let i = 0; i < this.batchUploads.length; i++) {
      const upload = this.batchUploads[i];
      try {
        const formData = new FormData();
        formData.append('pdf', upload.file);
        formData.append('date', upload.date);
        formData.append('institution', upload.institution);
        formData.append('title', upload.title);
        formData.append('content', '批量上传的文件，请在管理页面更新内容摘要');
        
        await axios.post(`${this.apiBaseUrl}/reports`, formData, {
          headers: {
            Authorization: `Bearer ${this.token}`,
            'Content-Type': 'multipart/form-data'
          }
        });
        
        this.batchSuccessCount++;
      } catch (error) {
        this.batchErrorFiles.push({
          filename: upload.filename,
          reason: error.response?.data?.message || '上传失败'
        });
      } finally {
        this.batchProgress = Math.floor(((i + 1) / this.batchUploads.length) * 100);
      }
    }
    
    // 处理完成后刷新数据
    if (this.batchSuccessCount > 0) {
      this.showNotification(`批量上传完成: ${this.batchSuccessCount} 个成功, ${this.batchErrorFiles.length} 个失败`, 'success');
      this.loadReports();
    } else {
      this.showNotification('批量上传失败', 'error');
    }
    
    // 重置批量上传状态
    setTimeout(() => {
      this.batchUploads = [];
      this.batchProgress = 0;
      this.$refs.batchFileInput.value = '';
    }, 5000);
  },
    }
});