# 🔍 Database & API Debugging Guide

## 🚀 Quick Debug Commands

### 1. Test Database Connection
```bash
npm run debug:db
```

### 2. Check Server Health
```bash
curl http://localhost:5000/api/health
```

### 3. Test Database Operations
```bash
curl http://localhost:5000/api/test-db
```

## 🔧 Debugging Endpoints

### Health Check: `/api/health`
- **Purpose**: Check overall API and database health
- **Response**: Database status, connection info, memory usage
- **Use Case**: Verify if backend is running and database is connected

### Database Test: `/api/test-db`
- **Purpose**: Test database connectivity and list collections
- **Response**: Database status, collections list, connection details
- **Use Case**: Verify database operations and structure

## 🗄️ Database Connection Issues

### Common Error Codes:
- **ENOTFOUND**: DNS resolution failed - check MongoDB URI
- **ECONNREFUSED**: Connection refused - MongoDB not running
- **MONGODB_ERROR**: Authentication failed - check credentials

### Debugging Steps:
1. **Check Environment Variables**:
   ```bash
   echo $MONGODB_URI
   echo $NODE_ENV
   ```

2. **Verify MongoDB Service**:
   ```bash
   # Local MongoDB
   sudo systemctl status mongod
   
   # MongoDB Atlas - check network access
   ```

3. **Test Connection String**:
   ```bash
   # Test with mongosh
   mongosh "your-connection-string"
   ```

## 🐛 Controller Debugging

### User Controller Debug Info:
- Request parameters validation
- Database query timing
- Query results logging
- Error categorization (CastError, ValidationError, etc.)

### Debug Output Example:
```
🔍 [UserController] Getting user profile for ID: 507f1f77bcf86cd799439011
📡 [UserController] Request headers: {...}
🗄️ [UserController] Executing database query...
⏱️ [UserController] Database query completed in: 45ms
📊 [UserController] Query result: User found
✅ [UserController] User details: {...}
```

## 🌐 Vercel Deployment Issues

### Common Problems:
1. **Environment Variables**: Not set in Vercel dashboard
2. **Build Commands**: Incorrect or missing
3. **Database URI**: Wrong format or network restrictions
4. **CORS**: Frontend domain not allowed

### Debugging Steps:
1. **Check Vercel Logs**:
   ```bash
   vercel logs
   ```

2. **Verify Environment Variables**:
   - Go to Vercel Dashboard → Project → Settings → Environment Variables
   - Ensure `MONGODB_URI` is set correctly

3. **Test Production Database**:
   - Use the debug script with production URI
   - Check network access from Vercel servers

## 📊 Performance Monitoring

### Database Query Timing:
- All database operations are timed
- Slow queries (>100ms) are logged
- Connection pool status monitored

### Memory Usage:
- Process memory usage logged
- Database connection pool size
- Uptime tracking

## 🔍 Troubleshooting Checklist

### Database Connection:
- [ ] MongoDB service running
- [ ] Connection string correct
- [ ] Network access allowed
- [ ] Authentication credentials valid

### Environment Variables:
- [ ] `MONGODB_URI` set correctly
- [ ] `JWT_SECRET` configured
- [ ] `NODE_ENV` specified

### API Endpoints:
- [ ] Server running on correct port
- [ ] Routes properly configured
- [ ] Middleware functions working
- [ ] CORS settings correct

### Vercel Deployment:
- [ ] Build command correct
- [ ] Output directory specified
- [ ] Environment variables set
- [ ] Function timeout adequate

## 🚨 Emergency Debugging

### If Database is Completely Down:
1. **Check MongoDB Status**:
   ```bash
   npm run debug:db
   ```

2. **Verify Connection String**:
   - Test with mongosh
   - Check network connectivity

3. **Fallback Options**:
   - Use local MongoDB for development
   - Check MongoDB Atlas status page
   - Verify IP whitelist

### If API is Not Responding:
1. **Check Server Logs**:
   ```bash
   npm run dev
   ```

2. **Test Health Endpoint**:
   ```bash
   curl http://localhost:5000/api/health
   ```

3. **Verify Port Configuration**:
   - Check if port 5000 is available
   - Verify firewall settings

## 📝 Debug Logs Format

### Connection Events:
- 🔌 Attempting to connect
- ✅ Connected successfully
- 🔴 Connection error
- 🟡 Disconnected

### Database Operations:
- 🗄️ Executing query
- ⏱️ Query timing
- 📊 Query results
- ❌ Operation errors

### API Requests:
- 🔍 Request received
- 📡 Request details
- ✅ Response sent
- ❌ Error occurred

## 🎯 Next Steps

1. **Run Debug Script**: `npm run debug:db`
2. **Check Health Endpoint**: `/api/health`
3. **Review Server Logs**: Look for error patterns
4. **Verify Environment**: Check all required variables
5. **Test Database**: Verify connection and operations

For additional help, check the server logs and run the debug script to identify specific issues.
