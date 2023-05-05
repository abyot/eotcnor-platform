/* global angular, dhis2, eotcnor */

'use strict';

//Controller for settings page
eotcnor.controller('HomeController',
        function($scope,
                $translate,
                $modal,
                $filter,
                Paginator,
                ModalService,
                NotificationService,
                SessionStorageService,
                TeiService,
                ProgramFactory,
                MetaDataFactory,
                DateUtils,
                CommonUtils) {

    $scope.model = {
        optionSets: null,
        trackedEntityAttributes: null,
        relationshipTypes: null,
        dataElementsById: null,
        selectedProgram: null,
        trackedEntityAccess: false,
        selectedStage: null,
        selectedEvent: null,
        events: [],
        programs: [],
        teis: [],
        tei: {},
        teiHeaders: [],
        showEditTei: false,
        showAddTei: false,
        showImportTei: false,
        editProfile: false,
        inputFile: null,
        sortHeader: null,
        membershipDate: null,
        filterExists: false
    };

    //Paging
    $scope.pager = {pageSize: 2000, page: 1, toolBarDisplay: 5};

    //watch for selection of org unit from tree
    $scope.$watch('selectedOrgUnit', function() {
        if( angular.isObject($scope.selectedOrgUnit)){
            $scope.cancelEdit();
            SessionStorageService.set('SELECTED_OU', $scope.selectedOrgUnit);
            if ( !$scope.model.optionSets ){
                $scope.model.optionSets = [];
                MetaDataFactory.getAll('optionSets').then(function(optionSets){
                    angular.forEach(optionSets, function(optionSet){
                        $scope.model.optionSets[optionSet.id] = optionSet;
                    });

                    $scope.model.dataElementsById = [];
                    MetaDataFactory.getAll('dataElements').then(function(des){
                        angular.forEach(des, function(de){
                            $scope.model.dataElementsById[de.id] = de;
                        });

                        $scope.model.relationshipTypes = [];
                        MetaDataFactory.getAll( 'relationshipTypes' ).then(function(relationshipTypes){
                            $scope.model.relationshipTypes = relationshipTypes.reduce( function(map, obj){
                                map[obj.id] = obj;
                                return map;
                            }, {});

                            $scope.model.trackedEntityAttributes = [];
                            MetaDataFactory.getAll('trackedEntityAttributes').then(function(teas){
                                angular.forEach(teas, function(tea){
                                    $scope.model.trackedEntityAttributes[tea.id] = tea;
                                });

                                $scope.loadPrograms($scope.selectedOrgUnit);
                            });
                        });
                    });
                });
            }
            else{
                $scope.loadPrograms($scope.selectedOrgUnit);
            }
        }
        else{
            $scope.reset();
        }
    });

    //watch for selection of program
    $scope.$watch('model.selectedProgram', function() {
        $scope.model.members = [];
        $scope.model.teiHeaders = [];
        $scope.filterText = {};
        if( angular.isObject($scope.model.selectedProgram) && $scope.model.selectedProgram.id){
            $scope.loadProgramDetails();
        }
        else{
            $scope.reset();
        }
    });

    //load programs associated with the selected org unit.
    $scope.loadPrograms = function() {
        $scope.model.programs = [];
        $scope.model.trackedEntityAccess = false;
        $scope.model.selectedOptionSet = null;
        $scope.model.members = [];
        if (angular.isObject($scope.selectedOrgUnit)) {
            ProgramFactory.getByOu( $scope.selectedOrgUnit ).then(function(res){
                $scope.model.programs = res.programs || [];
                $scope.model.selectedProgram = res.selectedProgram || null;
            });
        }
    };

    //load details for selected program
    $scope.loadProgramDetails = function (){
        if( $scope.model.selectedProgram && $scope.model.selectedProgram.id &&  $scope.model.selectedProgram.programStages && $scope.model.selectedProgram.programStages.length > 0){
            $scope.model.voteColumn = {id: $scope.selectedOrgUnit.id, displayName: $translate.instant('vote_number')};
            $scope.model.teiHeaders = [];
            $scope.filterText = {};
            $scope.model.programStageDataElements = null;
            $scope.model.trackedEntityAccess =  CommonUtils.userHasWriteAccess( 'ACCESSIBLE_TRACKEDENTITYTYPE', $scope.model.selectedProgram.trackedEntityType.id);

            var programDetails = TeiService.getProgramDetails( $scope.model.selectedProgram, $scope.model.trackedEntityAttributes);

            $scope.model.membershipDate = programDetails.membershipDate;
            $scope.model.teiHeaders = programDetails.teiHeaders;
            $scope.model.sortHeader = programDetails.sortHeader;
            $scope.filterText = programDetails.filterText;

            $scope.fetchTeis();
        }
        else if (!$scope.model.selectedProgram.programStages || $scope.model.selectedProgram.programStages.length < 1) {
            NotificationService.showNotifcationDialog($translate.instant("error"), $translate.instant("invalid_metadata_config_stage") );
            return;
        }
    };

    //fetch members for selected orgunit and program combination
    $scope.fetchTeis = function(){
        if( $scope.selectedOrgUnit && $scope.selectedOrgUnit.id && $scope.model.selectedProgram && $scope.model.selectedProgram.id ){
            //DESCENDANTS
            TeiService.getByProgramAndOu($scope.model.selectedProgram, $scope.selectedOrgUnit, $scope.model.sortHeader, $scope.filterParam, $scope.model.trackedEntityAttributes, $scope.model.dataElementsById, $scope.model.optionSets, $scope.pager).then(function(response){
                $scope.model.members = response.teis;
                if( response.pager ){
                    response.pager.pageSize = response.pager.pageSize ? response.pager.pageSize : $scope.pager.pageSize;
                    $scope.pager = response.pager;
                    $scope.pager.toolBarDisplay = 5;

                    Paginator.setPage($scope.pager.page);
                    Paginator.setPageCount($scope.pager.pageCount);
                    Paginator.setPageSize($scope.pager.pageSize);
                    Paginator.setItemCount($scope.pager.total);
                }


            });
        }
    };

    $scope.jumpToPage = function(){
        if($scope.pager && $scope.pager.page && $scope.pager.pageCount && $scope.pager.page > $scope.pager.pageCount){
            $scope.pager.page = $scope.pager.pageCount;
        }
        $scope.fetchTeis();
    };

    $scope.resetPageSize = function(){
        $scope.pager.page = 1;
        $scope.fetchTeis();
    };

    $scope.getPage = function(page){
        $scope.pager.page = page;
        $scope.fetchTeis();
    };

    $scope.showAddTei = function(){
        $scope.model.displayAddTei = true;
        $scope.model.tei = {};
        $scope.model.tei[$scope.model.membershipDate.id] = DateUtils.getToday();
    };

    $scope.showSearchTei = function(){
        $scope.model.displaysearchTei = true;
    };

    $scope.clearSearchParams = function(){
        $scope.filterParam = '';
        $scope.filterText = {};
        $scope.model.filterExists = false;
        $scope.fetchTeis();
    };

    $scope.addTei = function(){
        //check for form validity
        $scope.outerForm.submitted = true;
        if( $scope.outerForm.$invalid ){
            NotificationService.showNotifcationDialog($translate.instant("error"), $translate.instant("form_is_not_valid") );
            return false;
        }

        var mDate = DateUtils.formatFromUserToApi($scope.model.tei[$scope.model.membershipDate.id]);
        var tei = {
            trackedEntityType: $scope.model.selectedProgram.trackedEntityType.id,
            orgUnit: $scope.selectedOrgUnit.id,
            enrollments: [
                {
                    program: $scope.model.selectedProgram.id,
                    enrollmentDate: mDate,
                    orgUnit: $scope.selectedOrgUnit.id,
                    trackedEntityType: $scope.model.selectedProgram.trackedEntityType.id
                }
            ],
            attributes: []
        };

        angular.forEach($scope.model.selectedProgram.programTrackedEntityAttributes, function(pat){
            var value = $scope.model.tei[pat.trackedEntityAttribute.id];
            var tea = $scope.model.trackedEntityAttributes[pat.trackedEntityAttribute.id];
            value = CommonUtils.formatDataValue(null, value, tea, $scope.model.optionSets, 'API');

            if ( value ){
                tei.attributes.push({
                    attribute: tea.id,
                    value: value
                });
            }
        });

        TeiService.add(tei).then(function(data){
            if( data.response.importSummaries[0].status==='ERROR' ){
                NotificationService.showNotifcationDialog($translate.instant("error"), $translate.instant("tei_add_failed") + data.response.importSummaries[0].conflicts[0].value );
                return;
            }
            else{
                $scope.model.members.splice(0,0,$scope.model.tei);
            }
            $scope.cancelEdit();
        });
    };

    $scope.searchTei = function(){

        $scope.filterParam = '';
        $scope.model.filterExists = false;

        angular.forEach($scope.model.teiHeaders, function(header){
            if ( $scope.filterText[header.id] ){
                if ( header.optionSetValue ){
                    if( $scope.filterText[header.id].length > 0  ){
                        var filters = $scope.filterText[header.id].map(function(filt) {return filt.code;});
                        if( filters.length > 0 ){
                            $scope.filterParam += '&filter=' + header.id + ':IN:' + filters.join(';');
                            $scope.model.filterExists = true;
                        }
                    }
                }
                else if ( header.filterWithRange ){
                    if( $scope.filterText[header.id].start && $scope.filterText[header.id].start !== "" || $scope.filterText[header.id].end && $scope.filterText[header.id].end !== ""){
                        $scope.filterParam += '&filter=' + header.id;
                        if( $scope.filterText[header.id].start ){
                            $scope.filterParam += ':GT:' + $scope.filterText[header.id].start;
                            $scope.model.filterExists = true;
                        }
                        if( $scope.filterText[header.id].end ){
                            $scope.filterParam += ':LT:' + $scope.filterText[header.id].end;
                            $scope.model.filterExists = true;
                        }
                    }
                }
                else{
                    $scope.filterParam += '&filter=' + header.id + ':like:' + $scope.filterText[header.id];
                    $scope.model.filterExists = true;
                }
            }
        });

        if ( $scope.model.filterExists ){
            $scope.fetchTeis('DESCENDANTS');
            $scope.model.displaysearchTei = false;
        }
        else{
            NotificationService.showNotifcationDialog($translate.instant("error"), $translate.instant("search_param_empty") );
            return false;
        }
    };

    $scope.removeStartFilterText = function(gridColumnId){
        $scope.filterText[gridColumnId].start = undefined;
    };

    $scope.removeEndFilterText = function(gridColumnId){
        $scope.filterText[gridColumnId].end = undefined;
    };

    $scope.showEditTei = function(_selectedTei){
        var selectedTei = angular.copy( _selectedTei );
        $scope.model.displayEditTei = true;
        $scope.model.enrollablePrograms = $scope.model.programs;
        $scope.model.sourceTei = null;

        if ( selectedTei && selectedTei.instance && $scope.model.selectedProgram.programStages && $scope.model.selectedProgram.programStages.length > 0 ){
            $scope.model.selectedStage = $scope.model.selectedProgram.programStages[0];

            TeiService.get(selectedTei.instance).then(function(tei){
                selectedTei.relationships = tei.relationships;
                $scope.model.sourceTei = tei;
                if ( tei.enrollments.length > 0 ){
                    angular.forEach(tei.enrollments, function(en){
                        $scope.model.enrollablePrograms = $filter('filter')($scope.model.enrollablePrograms, function(pr) {
                            return (pr.id !== en.program );
                        }, true);

                        if ( en.program === $scope.model.selectedProgram.id && en.status === 'ACTIVE'){
                            $scope.model.selectedEnrollment = en;
                            $scope.model.selectedEnrollment.enrollmentDate = DateUtils.formatFromApiToUser($scope.model.selectedEnrollment.enrollmentDate);
                            selectedTei.enrollment = $scope.model.selectedEnrollment.enrollment;
                            selectedTei.enrollmentDate = DateUtils.formatFromApiToUser($scope.model.selectedEnrollment.enrollmentDate);

                            selectedTei.status = [];
                            if ( en.events && en.events.length > 0 ){
                                angular.forEach(en.events, function(ev){
                                    ev.values = {};
                                    ev.eventDate = DateUtils.formatFromApiToUser(ev.eventDate);
                                    angular.forEach(ev.dataValues, function(dv){
                                        var val = dv.value;
                                        var de = $scope.model.dataElementsById[dv.dataElement];
                                        val = CommonUtils.formatDataValue(ev, val, de, $scope.model.optionSets, 'USER');
                                        ev.values[dv.dataElement] = val;
                                    });
                                    selectedTei.status.push( ev );
                                });
                            }
                        }
                    });

                    $scope.model.tei = angular.copy(selectedTei);
                    $scope.model.originalTei = angular.copy(selectedTei);
                }
                else{
                    NotificationService.showNotifcationDialog($translate.instant("error"), $translate.instant("invalid_tracking_information") );
                    return;
                }
            });
        }
    };

    $scope.updateTei = function(){
        //check for form validity
        $scope.outerForm.submitted = true;
        if( $scope.outerForm.$invalid ){
            NotificationService.showNotifcationDialog($translate.instant("error"), $translate.instant("form_is_not_valid") );
            return false;
        }

        var tei = {
            trackedEntityType: $scope.model.tei.trackedEntityType,
            trackedEntityInstance: $scope.model.tei.trackedEntityInstance,
            orgUnit: $scope.model.tei.orgUnit,
            attributes: []
        };

        angular.forEach($scope.model.selectedProgram.programTrackedEntityAttributes, function(pat){
            var value = $scope.model.tei[pat.trackedEntityAttribute.id];
            var tea = $scope.model.trackedEntityAttributes[pat.trackedEntityAttribute.id];
            value = CommonUtils.formatDataValue(null, value, tea, $scope.model.optionSets, 'API');

            if ( value ){
                tei.attributes.push({
                    attribute: tea.id,
                    value: value
                });
            }
        });

        if ( $scope.model.selectedEnrollment.enrollmentDate !==  $scope.model.tei[$scope.model.membershipDate.id] ){
            var en = $scope.model.selectedEnrollment;
            en.enrollmentDate = DateUtils.formatFromUserToApi($scope.model.tei[$scope.model.membershipDate.id]);
            TeiService.updateEnrollment(en).then(function(){
            });
        }

        TeiService.update(tei, $scope.model.selectedProgram.id).then(function(data){
            if( data.response.status==='ERROR' ){
                NotificationService.showNotifcationDialog($translate.instant("error"), $translate.instant("operation_failed") + data.response.description );
                return;
            }
            else{
                var index = -1;
                for( var i=0; i<$scope.model.members.length; i++){
                    if( $scope.model.members[i].trackedEntityInstance === $scope.model.tei.trackedEntityInstance ){
                        index = i;
                        break;
                    }
                }
                if ( index !== -1 ){
                    $scope.model.members.splice(index,1);
                    $scope.model.members.splice(0,0,$scope.model.tei);
                }
                else{
                    $scope.model.members.splice(0,0,$scope.model.tei);
                }
            }
            $scope.showEditProfile();
        });

    };

    $scope.showTeiStatus = function( selectedStage, selectedEvent ){
        var modalInstance = $modal.open({
            templateUrl: 'components/status/tei-status.html',
            controller: 'StatusController',
            resolve: {
                tei: function(){
                    return angular.copy($scope.model.tei);
                },
                selectedEvent: function(){
                    return angular.copy(selectedEvent);
                },
                stage: function(){
                    return selectedStage;
                },
                program: function(){
                    return $scope.model.selectedProgram;
                },
                enrollment: function(){
                    return $scope.model.selectedEnrollment;
                },
                dataElementsById: function(){
                    return $scope.model.dataElementsById;
                },
                optionSetsById: function(){
                    return $scope.model.optionSets;
                }
            }
        });

        modalInstance.result.then(function( tei ) {
            $scope.model.tei = angular.copy(tei);
        });
    };

    $scope.showImportTei = function(){
        $scope.model.displaImportTei = true;
    };

    $scope.isOnAddEditMode = function(){
        return $scope.model.displayAddTei || $scope.model.displaImportTei || $scope.model.displayEditTei || $scope.model.displaysearchTei;
    };

    $scope.interacted = function(field) {
        var status = false;
        if(field){
            status = $scope.outerForm.submitted || field.$dirty;
        }
        return status;
    };

    $scope.cancelEdit = function(){
        $scope.model.tei = angular.copy($scope.model.originalTei);
        $scope.model.displayAddTei = false;
        $scope.model.displaImportTei = false;
        $scope.model.displayEditTei = false;
        $scope.model.displaysearchTei = false;
        $scope.model.inputFile = null;
        $scope.model.excelData = null;
        $scope.model.excelRows = [];
        $scope.model.excelColumns = [];
        $scope.model.selectedSheet = null;
        $scope.model.parsingStarted = false;
        $scope.model.parsingFinished = true;
        $scope.resetForm();
    };

    $scope.cancelSearch = function(){
        $scope.model.displaysearchTei = false;
        $scope.filterParam = '';
        $scope.resetForm();
        $scope.fetchTeis();
    };

    $scope.showEditProfile = function(){
        $scope.model.editProfile = !$scope.model.editProfile;
    };

    $scope.cancelEditProfile = function(){
        $scope.model.tei = $scope.model.originalTei;
        $scope.model.editProfile = false;
        $scope.resetForm();
    };

    $scope.cancelEditStatus = function(){
        $scope.model.selectedEvent = $scope.model.originalEvent;
        $scope.resetForm();
    };

    $scope.reset= function(){
        $scope.model.selectedProgram = null;
        $scope.model.teiHeaders = [];
        $scope.model.members = [];
        $scope.model.tei = {};

        $scope.resetForm();
    };

    $scope.resetForm = function(){
        $scope.outerForm.submitted = false;
        $scope.outerForm.$setPristine();
    };

    $scope.addOrEditTeiDenied = function(){
        return !$scope.model.trackedEntityAccess;
    };

    $scope.addOrEditStatusDenied = function(){
        return false;
    };

    $scope.sortItems = function( header ){
        $scope.reverse = ($scope.model.sortHeader && $scope.model.sortHeader.id === header.id) ? !$scope.reverse : false;
        var direction = 'asc';
        if ( $scope.model.sortHeader.id === header.id ){
            if ( $scope.model.sortHeader.direction === direction ){
                direction = 'desc';
            }
        }
        $scope.model.sortHeader = {id: header.id, direction: direction};
        $scope.fetchTeis();
    };

    $scope.deleteTei = function(){
        var modalOptions = {
            closeButtonText: 'no',
            actionButtonText: 'yes',
            headerText: 'warning',
            bodyText: 'are_you_sure_to_delete_tei'
        };

        ModalService.showModal({}, modalOptions).then(function(){
            TeiService.delete($scope.model.tei).then(function(result){
                var index = -1;
                for( var i=0; i<$scope.model.members.length; i++){
                    if( $scope.model.members[i].trackedEntityInstance === $scope.model.tei.trackedEntityInstance  ){
                        index = i;
                        break;
                    }
                }
                if ( index !== -1 ){
                    $scope.model.members.splice(index,1);
                }
                $scope.cancelEdit();
            }, function( result){
                CommonUtils.errorNotifier( result );
            });
        });
    };

    $scope.showHideColumns = function(){
        var modalInstance = $modal.open({
            templateUrl: 'views/column-modal.html',
            controller: 'ColumnDisplayController',
            resolve: {
                gridColumns: function () {
                    return $scope.model.teiHeaders;
                },
                hiddenGridColumns: function(){
                    return ($filter('filter')($scope.model.teiHeaders, {show: false})).length;
                }
            }
        });

        modalInstance.result.then(function (gridColumns) {
            $scope.model.teiHeaders = gridColumns;
        });
    };

    $scope.showAddRelationship = function(){
        var modalInstance = $modal.open({
            templateUrl: 'components/relationship/tei-relationship.html',
            controller: 'RelationshipController',
            windowClass: 'modal-full-window',
            resolve: {
                tei: function(){
                    return angular.copy($scope.model.tei);
                },
                program: function(){
                    return $scope.model.selectedProgram;
                },
                relationshipTypes: function(){
                    return $scope.model.relationshipTypes;
                },
                trackedEntityAttributes: function(){
                    return $scope.model.trackedEntityAttributes;
                },
                dataElementsById: function(){
                    return $scope.model.dataElementsById;
                },
                optionSetsById: function(){
                    return $scope.model.optionSets;
                },
                selectedOrgUnit: function(){
                    return $scope.selectedOrgUnit;
                }
            }
        });

        modalInstance.result.then(function( tei ) {
            $scope.model.tei = angular.copy(tei);
        });
    };

    $scope.additionalTracking = function(){
        var modalInstance = $modal.open({
            templateUrl: 'components/enrollment/tei-enrollment.html',
            controller: 'EnrollmentController',
            resolve: {
                sourceTei: function(){
                    return angular.copy($scope.model.sourceTei);
                },
                tei: function(){
                    return angular.copy($scope.model.tei);
                },
                programs: function(){
                    return angular.copy($scope.model.enrollablePrograms);
                },
                trackedEntityAttributes: function(){
                    return $scope.model.trackedEntityAttributes;
                },
                dataElementsById: function(){
                    return $scope.model.dataElementsById;
                },
                optionSetsById: function(){
                    return $scope.model.optionSets;
                },
                selectedOrgUnit: function(){
                    return $scope.selectedOrgUnit;
                }
            }
        });

        modalInstance.result.then(function( tei ) {
            $scope.model.tei = angular.copy(tei);
        });
    };

    $scope.exportData = function ( name ) {
        var blob = new Blob([document.getElementById('exportTable').innerHTML], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=utf-8"
        });

        var reportName = "members-list.xls";
        if( name ){
            reportName = name + '.xls';
        }
        saveAs(blob, reportName);
    };
});
