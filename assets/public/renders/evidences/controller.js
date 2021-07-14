/*!
governify-project-gauss-reporter 1.0.0, built on: 2018-04-19
Copyright (C) 2018 ISA group
http://www.isa.us.es/
https://github.com/isa-group/governify-project-gauss-reporter

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.*/

$scope.error = null;
$scope.loading = true;
$scope.progress = 0;
$scope.evidences = [];
$scope.DEFAULT_AGREEMENT = "SCO";
$scope.DEFAULT_INDICATORS = ["SCO_TRS", "SCO_TRLO", "SCO_TRLP", "SCO_PU"];
$scope.DEFAULT_TYPES = ["metrics", "guarantees"];
$scope.calculated = false;
$scope.loadingOverrides = false;
$scope.query = {};
$scope.reason = "";

jQuery.loadScript = function (url, callback) {
    jQuery.ajax({
        url: url,
        dataType: 'script',
        success: callback,
        async: true
    });
}

$.loadScript('https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.29.1/moment.min.js', function(){
    $.loadScript('https://cdnjs.cloudflare.com/ajax/libs/moment-timezone/0.5.33/moment-timezone-with-data.min.js', function(){
        $.loadScript('https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.29.1/locale/es.min.js', function(){
            var queryString = window.location.search;
            var urlParams = new URLSearchParams(queryString);
            var agreement = urlParams.get('agreement');
            var period = urlParams.get('period');
            var tz = urlParams.get('tz');
            var guarantee = urlParams.get('guarantee')
            
            var monthYear = moment.tz(period, 'x', tz).locale('es').format('MMMM YYYY', 'es');
            var month = moment.tz(period, 'x', tz).locale('es').format('MMMM', 'es');
            $scope.agreementMonth = month;

            $scope.query = {
                agreement: agreement,
                indicator: guarantee,
                tz: tz,
                type: "guarantees",
                period: period,
                periodFormated: monthYear.charAt(0).toUpperCase() + monthYear.slice(1),
            };

            var getEvidences = (queryParam) => {
                return $q((resolve, reject) => {
                    var url;
                    console.log(queryParam)
                    if (queryParam.agreement && queryParam.indicator && queryParam.type && queryParam.from) {
                        queryParam.indicator = queryParam.indicator;
                        var evidencesRegistryEndpoint = "$_[infrastructure.external.registry.default]" + '/api/v6' + "/states/" + queryParam.agreement + "/filtered";

                        url = evidencesRegistryEndpoint + "?" +
                            "indicator=" + queryParam.indicator +
                            "&type=" + queryParam.type +
                            "&from=" + queryParam.from;

                        console.log(url)
                        $http.get(url).then((response) => {
                            try {
                                var data = response.data;
                                if (!Array.isArray(data)){
                                    return reject({
                                        status: 500,
                                        message: 'Registry data is not an array with data'
                                    });
                                }

                                let lastEvidencesData = data[data.length-1];
                                if (lastEvidencesData.records.evidences && Array.isArray(lastEvidencesData.records.evidences)) {
                                    return resolve(lastEvidencesData.records.evidences);
                                } else {
                                    return reject({
                                        status: 500,
                                        message: 'No evidences returned in registry data' + lastEvidencesData.records
                                    });
                                }
                            } catch (err) {
                                return reject({
                                    status: 500,
                                    message: err
                                });
                            }
                        }, (response) => {
                            return reject({
                                status: response.codeStatus,
                                message: "Registry unexpected data " + JSON.stringify(response)
                            });
                        });
                    } else {
                        console.log(queryParam);
                        reject();
                    }

                });
            };

            var getBills = (from, to) => {
                return $q((resolve, reject) => {
                    var url;

                    var url = "$_[infrastructure.external.registry.default]" + '/api/v6' + "/bills/" + agreement + "?from=" + from + "&to=" + to;

                    console.log(url)
                    $http.get(url).then((response) => {
                        try {
                            var data = response.data;
                            if (!Array.isArray(data)) {
                                return reject({
                                    status: 500,
                                    message: 'Registry data is not an array with data'
                                });
                            } else {
                                return resolve(data[0]);
                            }
                        } catch (err) {
                            return reject({
                                status: 500,
                                message: err
                            });
                        }
                    }, (response) => {
                        return reject({
                            status: response.codeStatus,
                            message: "Registry unexpected data " + JSON.stringify(response)
                        });
                    });
                });
            };

            var updateANS = (data) => {

                return $q((resolve, reject) => {
                    var url;
                    var evidencesRegistryEndpoint = "$_[infrastructure.external.registry.default]" + '/api/v6' + "/states/" + agreement + "/guarantees/";

                    url = evidencesRegistryEndpoint + guarantee + "/overrides";

                    console.log("Post new override: " + url);

                    $http.post(url, data).then((response) => {
                        try {
                            if (response.status != 200) {
                                return reject({
                                    status: 500,
                                    message: 'Post override failed'
                                });
                            } else {
                                return resolve(data);
                            }
                        } catch (err) {
                            return reject({
                                status: 500,
                                message: err
                            });
                        }
                    }, (response) => {
                        return reject({
                            status: response.status,
                            message: "Registry unexpected data " + JSON.stringify(response)
                        });
                    });

                });
            }

            var getRegisteredOverrides = () => {
                return $q((resolve, reject) => {
                    var url;
                    var evidencesRegistryEndpoint = "$_[infrastructure.external.registry.default]" + '/api/v6' + "/states/" + agreement + "/guarantees/";

                    url = evidencesRegistryEndpoint + guarantee + "/overrides";

                    console.log("Get registered overrides: " + url)
                    $http.get(url).then((response) => {
                        try {
                            var data = response.data;
                            if (!Array.isArray(data)) {
                                return reject({
                                    status: 500,
                                    message: 'Registry data is not an array'
                                });
                            } else {
                                return resolve(data);
                            }
                        } catch (err) {
                            return reject({
                                status: 500,
                                message: err
                            });
                        }
                    }, (response) => {
                        return reject({
                            status: response.codeStatus,
                            message: "Registry unexpected data " + JSON.stringify(response)
                        });
                    });

                });
            };

            var deleteOverride = (data) => {

                return $q((resolve, reject) => {
                    var url;
                    var evidencesRegistryEndpoint = "$_[infrastructure.external.registry.default]" + '/api/v6' + "/states/" + agreement + "/guarantees/";

                    url = evidencesRegistryEndpoint + guarantee + "/overrides";

                    console.log("Delete override: " + url);

                    $http.delete(url, { data: data, headers: { 'Content-Type': 'application/json' } }).then((response) => {
                        try {
                            if (response.status != 200) {
                                return reject({
                                    status: 500,
                                    message: 'Delete override failed'
                                });
                            } else {
                                return resolve(data);
                            }
                        } catch (err) {
                            return reject({
                                status: 500,
                                message: err
                            });
                        }
                    }, (response) => {
                        return reject({
                            status: response.codeStatus,
                            message: "Registry unexpected data " + JSON.stringify(response)
                        });
                    });

                });
            }

            var calculateReport = (queryParam) => {

                queryParam.from = moment.tz(queryParam.period, "x", queryParam.tz).toISOString();
                //   queryParam.to = moment.tz(queryParam.period, "x", queryParam.tz).add(1, "second").subtract(1, "millisecond").toISOString();


                getEvidences(queryParam).then((ev) => {

                    $scope.progress = 100;
                    $scope.typeEvidences = getTypeEvidences(ev);


                    $scope.evidences = ev;

                    for (var i = 0; i < $scope.typeEvidences.length; i++) {
                        if ($scope.typeEvidences[i].indexOf("evidence") >= 0) {
                            $scope.typeEvidence = $scope.typeEvidences[i]
                            break;
                        }
                    }

                    $scope.calculated = true;

                }, (err) => {
                    console.error(err);
                    $scope.calculated = false;
                });
            };


            $scope.clearData = () => {
                $scope.calculated = false;
            };

            var getTypeEvidences = (evidences) => {
                return Object.keys(evidences[0]).filter(e => e !== "id");
            };

            $scope.overrides = [];
            $scope.overridesReason = {};
            $scope.checkOverride = (id, reason) => {
                $scope.loadingOverrides = true;
                $scope.calculated = false;


                var from = moment.tz($scope.query.period, 'x', $scope.query.tz).toISOString();
                var to = moment.tz($scope.query.period, 'x', $scope.query.tz).add(1, "month").subtract(1, "millisecond").toISOString();

                var typeEvidence = $scope.typeEvidence;
                var data = {
                    scope: {},
                    period: { from: from, to: to },
                    evidences: {},
                    id: Number(id),
                    comment: reason
                }

                data["evidences"][$scope.typeEvidence] = true;

                data = JSON.stringify(data);
                console.log(data);

                updateANS(data).then((response) => {

                    $scope.overrides.push(id);
                    $scope.overridesReason[id] = reason;
                    $scope.reason = "";
                    $scope.loadingOverrides = false;
                    $scope.calculated = true;

                }, (err) => {

                    if (err.status == '400') {
                        document.getElementById("trigger1").click();
                    }

                    console.error(err);
                    $scope.loadingOverrides = false;
                    $scope.calculated = true;
                });
            }

            $scope.undoOverride = (id) => {
                if (confirm("¿Está seguro de que quiere desmarcar el falso positivo? Esta acción no puede deshacerse.")) {
                    $scope.loadingOverrides = true;
                    $scope.calculated = false;

                    var from = moment.tz($scope.query.period, 'x', $scope.query.tz).toISOString();
                    var to = moment.tz($scope.query.period, 'x', $scope.query.tz).add(1, "month").subtract(1, "millisecond").toISOString();

                    var data = {
                        scope: {},
                        period: { from: from, to: to },
                        id: Number(id),
                        evidences: {},
                        comment: $scope.overridesReason[id]
                    }

                    data["evidences"][$scope.typeEvidence] = true;

                    data = JSON.stringify(data);
                    console.log(data);
                    deleteOverride(data).then((response) => {
                        $scope.overrides.splice($scope.overrides.indexOf(id), 1);
                        delete $scope.overridesReason[id];
                        $scope.calculated = true;
                        $scope.loadingOverrides = false;
                    }, (err) => {
                        console.error(err);
                        $scope.loadingOverrides = false;
                        $scope.calculated = true;
                    });


                }
            }

            $scope.checkRegisteredOverride = (id) => {
                var from = moment.tz($scope.query.period, 'x', $scope.query.tz).toISOString();
                var to = moment.tz($scope.query.period, 'x', $scope.query.tz).add(1, "month").subtract(1, "millisecond").toISOString();

                var data = {
                    scope: {},
                    period: { from: from, to: to },
                    id: Number(id),
                    evidences: {},
                }

                data["evidences"][$scope.typeEvidence] = true;

                for (var i = 0; i < $scope.registeredOverridesLength; i++) {
                    var override = $scope.registeredOverrides[i];
                    if (override.id == data.id
                        && override.period.from == data.period.from && override.period.to == data.period.to
                        && override.evidences == override.evidences) {
                        $scope.overridesReason[id] = override.comment;
                        return true;
                    }
                }
                return false;

            }

            $scope.changeCurrentId = (id) => {
                $scope.currentId = id;
                $scope.reason = "";
            }

            $scope.changeCompleteReason = (completeReason) => {
                $scope.completeReason = completeReason;
            }

            $scope.refreshPage = () => {
                window.location.reload(true);
            }

            if (agreement && guarantee && period) {
                calculateReport($scope.query);
                getRegisteredOverrides().then((response) => {
                    $scope.registeredOverrides = response;
                    $scope.registeredOverridesLength = response.length;

                    // var from = moment.tz($scope.query.period, "x", $scope.query.tz).toISOString();
                    // var to = moment.tz($scope.query.period, "x", $scope.query.tz).endOf('month').toISOString();
                    // getBills(from, to).then((bill) => {
                    //     $scope.openBill = bill.state === 'open' ? true : false;
                    // });
                }, (err) => {
                    console.error(err);
                });
            }

            $scope.$apply();
        });
    });
});