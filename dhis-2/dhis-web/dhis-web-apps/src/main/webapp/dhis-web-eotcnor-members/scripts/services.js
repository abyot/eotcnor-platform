/* global angular, moment, dhis2, parseFloat */

'use strict';

/* Services */

var eotcnorServices = angular.module('eotcnorServices', ['ngResource'])

.factory('D2StorageService', function(){
    var store = new dhis2.storage.Store({
        name: "dhis2eotcnor",
        adapters: [dhis2.storage.IndexedDBAdapter, dhis2.storage.DomSessionStorageAdapter, dhis2.storage.InMemoryAdapter],
        objectStores: ['programs', 'optionSets', 'trackedEntityAttributes', 'attributes', 'dataElements', 'ouLevels', 'relationshipTypes']
    });
    return{
        currentStore: store
    };
})

.service('PeriodService', function(CalendarService){

    this.getPeriods = function(periodType, periodOffset, futurePeriods){
        if(!periodType){
            return [];
        }

        var calendarSetting = CalendarService.getSetting();

        dhis2.period.format = calendarSetting.keyDateFormat;

        dhis2.period.calendar = $.calendars.instance( calendarSetting.keyCalendar );

        dhis2.period.generator = new dhis2.period.PeriodGenerator( dhis2.period.calendar, dhis2.period.format );

        dhis2.period.picker = new dhis2.period.DatePicker( dhis2.period.calendar, dhis2.period.format );

        var d2Periods = dhis2.period.generator.generateReversedPeriods( periodType, periodOffset );

        d2Periods = dhis2.period.generator.filterOpenPeriods( periodType, d2Periods, futurePeriods, null, null );

        angular.forEach(d2Periods, function(p){
            //p.endDate = DateUtils.formatFromApiToUser(p.endDate);
            //p.startDate = DateUtils.formatFromApiToUser(p.startDate);
            p.displayName = p.name;
            p.id = p.iso;
        });

        return d2Periods;
    };
})

/* Factory to fetch optionSets */
.factory('OptionSetService', function($q, $rootScope, D2StorageService) {
    return {
        getAll: function(){

            var def = $q.defer();

            D2StorageService.currentStore.open().done(function(){
                D2StorageService.currentStore.getAll('optionSets').done(function(optionSets){
                    $rootScope.$apply(function(){
                        def.resolve(optionSets);
                    });
                });
            });

            return def.promise;
        },
        get: function(uid){
            var def = $q.defer();

            D2StorageService.currentStore.open().done(function(){
                D2StorageService.currentStore.get('optionSets', uid).done(function(optionSet){
                    $rootScope.$apply(function(){
                        def.resolve(optionSet);
                    });
                });
            });
            return def.promise;
        },
        getCode: function(options, key){
            if(options){
                for(var i=0; i<options.length; i++){
                    if( key === options[i].displayName){
                        return options[i].code;
                    }
                }
            }
            return key;
        },
        getName: function(options, key){
            if(options){
                for(var i=0; i<options.length; i++){
                    if( key === options[i].code){
                        return options[i].displayName;
                    }
                }
            }
            return key;
        }
    };
})

/* Factory to fetch programs */
.factory('ProgramFactory', function($q, $rootScope, D2StorageService, CommonUtils, orderByFilter) {

    return {
        get: function(uid){

            var def = $q.defer();

            D2StorageService.currentStore.open().done(function(){
                D2StorageService.currentStore.get('programs', uid).done(function(ds){
                    $rootScope.$apply(function(){
                        def.resolve(ds);
                    });
                });
            });
            return def.promise;
        },
        getByOu: function(ou, selectedProgram){
            var def = $q.defer();

            D2StorageService.currentStore.open().done(function(){
                D2StorageService.currentStore.getAll('programs').done(function(prs){
                    var programs = [];
                    angular.forEach(prs, function(pr){
                        if(pr.organisationUnits.hasOwnProperty( ou.id ) && pr.id && CommonUtils.userHasWriteAccess( 'ACCESSIBLE_PROGRAMS', pr.id)){
                            programs.push(pr);
                        }
                    });

                    programs = orderByFilter(programs, '-displayName').reverse();

                    if(programs.length === 0){
                        selectedProgram = null;
                    }
                    else if(programs.length === 1){
                        selectedProgram = programs[0];
                    }
                    else{
                        if(selectedProgram){
                            var continueLoop = true;
                            for(var i=0; i<programs.length && continueLoop; i++){
                                if(programs[i].id === selectedProgram.id){
                                    selectedProgram = programs[i];
                                    continueLoop = false;
                                }
                            }
                            if(continueLoop){
                                selectedProgram = null;
                            }
                        }
                    }

                    if(!selectedProgram || angular.isUndefined(selectedProgram) && programs.legth > 0){
                        selectedProgram = programs[0];
                    }

                    $rootScope.$apply(function(){
                        def.resolve({programs: programs, selectedProgram: selectedProgram});
                    });
                });
            });
            return def.promise;
        }
    };
})

/* factory to fetch and process programValidations */
.factory('MetaDataFactory', function($q, $rootScope, D2StorageService, orderByFilter) {

    return {
        get: function(store, uid){
            var def = $q.defer();
            D2StorageService.currentStore.open().done(function(){
                D2StorageService.currentStore.get(store, uid).done(function(obj){
                    $rootScope.$apply(function(){
                        def.resolve(obj);
                    });
                });
            });
            return def.promise;
        },
        set: function(store, obj){
            var def = $q.defer();
            D2StorageService.currentStore.open().done(function(){
                D2StorageService.currentStore.set(store, obj).done(function(obj){
                    $rootScope.$apply(function(){
                        def.resolve(obj);
                    });
                });
            });
            return def.promise;
        },
        getAll: function(store){
            var def = $q.defer();
            D2StorageService.currentStore.open().done(function(){
                D2StorageService.currentStore.getAll(store).done(function(objs){
                    objs = orderByFilter(objs, '-displayName').reverse();
                    $rootScope.$apply(function(){
                        def.resolve(objs);
                    });
                });
            });
            return def.promise;
        },
        getByProperty: function(store, prop, val){
            var def = $q.defer();
            D2StorageService.currentStore.open().done(function(){
                D2StorageService.currentStore.getAll(store).done(function(objs){
                    var selectedObject = null;
                    for(var i=0; i<objs.length; i++){
                        if(objs[i][prop] ){
                            objs[i][prop] = objs[i][prop].toLocaleLowerCase();
                            if( objs[i][prop] === val )
                            {
                                selectedObject = objs[i];
                                break;
                            }
                        }
                    }

                    $rootScope.$apply(function(){
                        def.resolve(selectedObject);
                    });
                });
            });
            return def.promise;
        }
    };
})

/* service for handling events */
.service('TeiService', function($http, DHIS2URL, CommonUtils, DateUtils) {

    var TeiFunctions = {
        get: function(uid){
            var promise = $http.get(DHIS2URL + '/trackedEntityInstances/' + uid + '.json?fields=*').then(function (response) {
                return response.data;
            } ,function(error) {
                return null;
            });
            return promise;
        },
        getByProgramAndOu: function( program, orgUnit, sortHeader, filterText, attributesById, dataElementsById, optionSetsById, pager ){
            var promise;
            if( program.id && orgUnit.id ){
                var order = 'order=created:desc';
                if ( sortHeader && sortHeader.id ){
                    order = 'order=' + sortHeader.id + ':' + sortHeader.direction;
                }
                if ( filterText ){
                    order += filterText;
                }

                var url = DHIS2URL + '/trackedEntityInstances/query.json?' + order + '&ouMode=SELECTED&ou=' + orgUnit.id + '&program=' + program.id;

                if(pager){
                    var pgSize = pager.pageSize ? pager.pageSize : 50;
                    var pg = pager.page ? pager.page : 1;
                    pgSize = pgSize > 1 ? pgSize  : 1;
                    pg = pg > 1 ? pg : 1;
                    url += '&pageSize=' + pgSize + '&page=' + pg + '&totalPages=true';
                }

                promise = $http.get( url ).then(function (response) {
                    var teis = [];
                    var pager = {};
                    if ( response.data && response.data.headers && response.data.rows ){
                        var rows = response.data.rows, headers = response.data.headers;
                        pager = response.data.metaData.pager;
                        for (var i = 0; i<rows.length; i++) {
                            var tei = {};
                            for( var j=0; j<rows[i].length; j++){
                                var val = rows[i][j];
                                var att = attributesById[headers[j].name];
                                if ( att ){
                                    val = CommonUtils.formatDataValue(null, val, att, optionSetsById, 'USER');
                                }
                                tei[headers[j].name] = val;
                            }

                            tei.trackedEntityInstance = tei.instance;
                            tei.trackedEntityType = tei.te;
                            tei.orgUnit = tei.ou;
                            teis.push( tei );
                        }
                    }
                    return {teis: teis, pager: response.data.metaData.pager};
                } ,function(error) {
                    return null;
                });
            }
            return promise;
        },
        add: function( tei ){
            var promise = $http.post(DHIS2URL + '/trackedEntityInstances.json?strategy=SYNC', tei).then(function (response) {
                return response.data;
            } ,function(error) {
                return error.data;
            });
            return promise;
        },
        update: function( tei, programId ){
            var programFilter = programId ? "?program=" + programId : "";
            var promise = $http.put(DHIS2URL + '/trackedEntityInstances/' + tei.trackedEntityInstance + programFilter, tei).then(function (response) {
                return response.data;
            } ,function(error) {
                return error.data;
            });
            return promise;
        },
        delete: function( tei ){
            var promise = $http.delete(DHIS2URL + '/trackedEntityInstances/' + tei.trackedEntityInstance).then(function(response){
                return response.data;
            });
            return promise;
        },
        updateEnrollment: function( enrollment ){
            var promise = $http.put(DHIS2URL + '/enrollments/' + enrollment.enrollment , enrollment).then(function (response) {
                return response.data;
            } ,function(error) {
                return error.data;
            });
            return promise;
        },
        updateStatus: function( event ){
            var promise = $http.put(DHIS2URL + '/events/' + event.event , event).then(function (response) {
                return response.data;
            } ,function(error) {
                return error.data;
            });
            return promise;
        },
        addStatus: function( event ){
            var promise = $http.post(DHIS2URL + '/events.json', event).then(function (response) {
                return response.data;
            } ,function(error) {
                return error.data;
            });
            return promise;
        },
        deleteStatus: function( event ){
            var promise = $http.delete(DHIS2URL + '/events/' + event.event).then(function(response){
                return response.data;
            });
            return promise;
        },
        getProgramDetails: function( program, trackedEntityAttributes ){
            var teiHeaders = [], sortHeader = {}, filterText = {}, membershipDate = null;

            if ( program && program.programTrackedEntityAttributes ){
                angular.forEach(program.programTrackedEntityAttributes, function(pat){
                    if( pat.trackedEntityAttribute && pat.trackedEntityAttribute.id ){
                        var tea = trackedEntityAttributes[pat.trackedEntityAttribute.id];
                        if( tea ){
                            tea.filterWithRange = false;
                            if ( tea.valueType === 'DATE' ||
                                tea.valueType === 'NUMBER' ||
                                tea.valueType === 'INTEGER' ||
                                tea.valueType === 'INTEGER_POSITIVE' ||
                                tea.valueType === 'INTEGER_NEGATIVE' ||
                                tea.valueType === 'INTEGER_ZERO_OR_POSITIVE' ){
                                tea.filterWithRange = true;
                                filterText[tea.id] = {};
                            }
                            tea.displayInList = pat.displayInList;
                            tea.mandatory = pat.mandatory;
                            tea.show = tea.displayInList;


                            teiHeaders.push(tea);

                            if ( tea.unique ){
                                sortHeader = {id: tea.id, direction: 'asc'};
                            }
                            if ( tea.membershipDate ){
                                membershipDate = tea;
                            }
                        }
                    }
                });
            }
            return {teiHeaders: teiHeaders, sortHeader: sortHeader, filterText: filterText, membershipDate: membershipDate};
        }
    };

    return TeiFunctions;
})

/* Service for uploading/downloading file */
.service('FileService', function ($http, DHIS2URL) {

    return {
        get: function (uid) {
            var promise = $http.get(DHIS2URL + '/fileResources/' + uid).then(function (response) {
                return response.data;
            } ,function(error) {
                return null;
            });
            return promise;
        },
        download: function (fileName) {
            var promise = $http.get(fileName).then(function (response) {
                return response.data;
            }, function(error) {
                return null;
            });
            return promise;
        },
        upload: function(file){
            var formData = new FormData();
            formData.append('file', file);
            var headers = {transformRequest: angular.identity, headers: {'Content-Type': undefined}};
            var promise = $http.post(DHIS2URL + '/fileResources', formData, headers).then(function(response){
                return response.data;
            },function(error) {
               return null;
            });
            return promise;
        }
    };
})

.service('OrgUnitService', function($http){
    var orgUnit, orgUnitPromise;
    return {
        get: function( uid, level ){
            if( orgUnit !== uid ){
                orgUnitPromise = $http.get( '../api/organisationUnits.json?filter=path:like:/' + uid + '&filter=level:le:' + level + '&fields=id,displayName,path,level,parent[id]&paging=false' ).then(function(response){
                    orgUnit = response.data.id;
                    return response.data;
                });
            }
            return orgUnitPromise;
        }
    };
})

.service('ExcelService', function($q, $rootScope){
    return {
        load: function(file){

            var promise = $q(function(resolve, reject) {
                var reader = new FileReader();
                reader.onload = function (e) {
                    var data = reader.result;
                    console.log('the data:  ', data);
                    var workbook = XLSX.read(data, {
                        type: 'binary'
                    });
                    var sheetNames = workbook.SheetNames;
                    var worksheet = workbook.Sheets[sheetNames[0]];
                    var workbook = XLSX.utils.sheet_to_json(worksheet);
                    resolve(workbook);
                };
                reader.onerror = function (ex) {
                    reject(ex);
                };
                reader.readAsArrayBuffer(file);
            });
            return promise;

            /*var def = $q.defer();
            XLSXReader(file, true, true, function(data) {
                $rootScope.$apply(function() {
                    def.resolve(data);
                });
            });

            return def.promise;*/
        },
        parse: function( workbook, sheet ){
            /*var xlsReader = function( file ){
                return new Promise((resolve, reject) => {
                    var reader = new FileReader();
                    reader.onload = res => {
                        var data = res.target.result;
                        var workbook = XLSX.read(data, {type: 'binary'});
                        var parsedData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
                        resolve(parsedData);
                    };
                    reader.onerror = err => reject(err);

                    reader.readAsBinaryString(file);
                });
            };

            var promise = xlsReader( file );
            promise.then(function( result ){
                return result;
            });
            return promise;*/
            console.log('workbook:  ', workbook);
            console.log('sheets:  ', sheet);
            return XLSX.utils.sheet_to_json(workbook.Sheets[sheet], {raw: true, defval:null});
        },
        load: function( file ){

            var xlsReader = function( file ){
                return new Promise((resolve, reject) => {
                    var reader = new FileReader();
                    reader.onload = res => {
                        var data = res.target.result;
                        var workbook = XLSX.read(data, {type: 'binary'});
                        //var parsedData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
                        //resolve(parsedData);
                        resolve( workbook );
                    };
                    reader.onerror = err => reject(err);

                    reader.readAsBinaryString(file);
                });
            };

            var promise = xlsReader( file );
            promise.then(function( result ){
                return result;
            });
            return promise;
        }
    };
})

/*Orgunit service for local db */
.service('IndexDBService', function($window, $q){

    var indexedDB = $window.indexedDB;
    var db = null;

    var open = function( dbName ){
        var deferred = $q.defer();

        var request = indexedDB.open( dbName );

        request.onsuccess = function(e) {
          db = e.target.result;
          deferred.resolve();
        };

        request.onerror = function(){
          deferred.reject();
        };

        return deferred.promise;
    };

    var get = function(storeName, uid){

        var deferred = $q.defer();

        if( db === null){
            deferred.reject("DB not opened");
        }
        else{
            var tx = db.transaction([storeName]);
            var store = tx.objectStore(storeName);
            var query = store.get(uid);

            query.onsuccess = function(e){
                deferred.resolve(e.target.result);
            };
        }
        return deferred.promise;
    };

    return {
        open: open,
        get: get
    };
});