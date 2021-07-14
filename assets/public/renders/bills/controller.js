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

            $scope.agreement = agreement;


            $scope.years = []
            $scope.yearMonths = {};

            var getBills = () => {
                return $q((resolve, reject) => {
                    var url;
                    if (agreement) {
                        var url = "$_[infrastructure.external.registry.default]" + '/api/v6' + "/bills/" + agreement;

                        console.log(url);

                        $http.get(url).then((response) => {
                            try {
                                var data = response.data;
                                if (!Array.isArray(data)) {
                                    return reject({
                                        status: 500,
                                        message: 'Registry data is not an array with data'
                                    });
                                } else {
                                    console.log("Data received");
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
                    } else {
                        console.log(queryParam);
                        reject();
                    }

                });
            };

            var updateBills = (data) => {

                return $q((resolve, reject) => {
                    var url = "$_[infrastructure.external.registry.default]" + '/api/v6' + "/bills/" + agreement + "/" + data.billId;


                    console.log("Put bill: " + url);
                    console.log(data)

                    $http.put(url, data).then((response) => {
                        try {
                            if (response.status != 200) {
                                return reject({
                                    status: 500,
                                    message: 'Put bills failed'
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
                        if (response.status == 403) {
                            alert("La factura no puede editarse porque está cerrada.")
                        }
                        return reject({
                            status: response.codeStatus,
                            message: "Registry unexpected data " + JSON.stringify(response)
                        });
                    });

                });
            }

            var calculateMonths = (bills) => {
                for (var i = bills.length - 1; i >= 0; i--) {
                    var billl = bills[i];
                    var formatDate = bills[i].period.from.split("T")[0];
                    var year = moment(formatDate).add(1, "month").format('YYYY', 'es');
                    var month = moment(formatDate).add(1, "month").format('MMMM', 'es');

                    month = month.charAt(0).toUpperCase() + month.slice(1);

                    if ($scope.yearMonths[year]) {
                        if ($scope.yearMonths[year].indexOf(month) < 0) {
                            $scope.yearMonths[year].push({ month: month, state: bills[i].state, closeDate: bills[i].closeDate, bill: bills[i] });
                        }
                    } else {
                        $scope.yearMonths[year] = [{ month: month, state: bills[i].state, closeDate: bills[i].closeDate, bill: bills[i] }];
                        $scope.years.push(year);
                    }

                }

                console.log($scope.yearMonths)

                $scope.years;
                $scope.firstBill = $scope.yearMonths[Object.keys($scope.yearMonths)[0]][0].month + " " + Object.keys($scope.yearMonths)[0];
                $scope.lastBill = $scope.yearMonths[Object.keys($scope.yearMonths)[Object.keys($scope.yearMonths).length - 1]][0].month + " " + Object.keys($scope.yearMonths)[Object.keys($scope.yearMonths).length - 1];

            };

            $scope.closeBill = (bill) => {
                var index = $scope.bills.indexOf(bill);
                var closeDate = moment().toISOString();

                bill.closeDate = closeDate;
                bill.state = "closed";

                $scope.bills[index] = bill;

                var updatedBill = {
                    "agreementId": agreement,
                    "billId": bill.billId.toString(),
                    "period":
                    {
                        "from": bill.period.from,
                        "to": bill.period.to
                    },
                    "state": "closed",
                    "closeDate": closeDate
                }

                updateBills(updatedBill).then((response) => {

                    $scope.years = []
                    $scope.yearMonths = {};
                    calculateMonths($scope.bills);

                }, (err) => {
                    console.error(err);
                    $scope.loadingOverrides = false;
                    $scope.calculated = true;
                });

            }

            $scope.changeCloseData = (bill, month, year) => {
                $scope.currentBill = bill;
                $scope.currentMonth = month;
                $scope.currentYear = year;
            }



            $scope.getBills = () => {
                getBills().then((bills) => {
                    $scope.bills = bills;
                    calculateMonths(bills);

                }, (err) => {
                    console.error(err);
                    $scope.loadingOverrides = false;
                    $scope.calculated = true;
                });

            }

            if (agreement) {
                $scope.getBills();
            }

            $scope.$apply();
        });
    });
});