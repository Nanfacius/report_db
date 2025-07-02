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
        }
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
    }
    }
});