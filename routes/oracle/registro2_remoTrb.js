/**
 * Created by diego on 7/17/15.
 */

module.exports = function (log, oracle) {
    'use strict';

    var express = require('express'),
        router = express.Router(),
        util = require("util"),
        moment = require('moment');

    function getRegistro2Remotrb(req, res) {

        oracle.pool.getConnection(function (err, connection) {
            var strSql = '',
                orderBy,
                strWhere = '',
                skip,
                limit;

            if (err) {
                console.log(err, "Error acquiring from pool.");
                res.status(500).json({ status: 'ERROR', data: err });
            } else {

                orderBy = oracle.orderBy(req.query.order);

                skip = parseInt(req.params.skip, 10);
                limit = parseInt(req.params.limit, 10);
                strSql = "SELECT * FROM " +
                    " (SELECT " +
                    "    ID, " +
                    "    TIPOREGISTRO, " +
                    "    DOCUMENTO, " +
                    "    SUMARIA, " +
                    "    CODIGOPUERTO, " +
                    "    CONOCIMIENTO, " +
                    "    NRO_LINEA, " +
                    "    COD_EMBALAJE, " +
                    "    CANTIDAD, " +
                    "    PESO, " +
                    "    REGISTRADO_POR, " +
                    "    REGISTRADO_EN, " +
                    "    ROW_NUMBER() OVER (ORDER BY " + orderBy + ") R " +
                    "   FROM V_REGISTRO2_REMOTRB %s) " +
                    "WHERE R BETWEEN :1 and :2";

                if (req.query.documento || req.query.sumaria) {
                    strWhere += " WHERE ";
                }

                if (req.query.documento) {
                    strWhere += util.format(" DOCUMENTO = '%s' AND ", req.query.documento);
                }

                strWhere = strWhere.substr(0, strWhere.length - 4);
                strSql = util.format(strSql, strWhere);

                connection.execute(strSql, [skip + 1, skip + limit], function (err, data) {
                    if (err) {
                        oracle.doRelease(connection);
                        res.status(500).json({ status: 'ERROR', data: err.message });
                    } else {
                        strSql = "SELECT COUNT(*) AS TOTAL FROM REGISTRO2_REMOTRB";
                        if (strWhere !== '') {
                            strSql += util.format(" %s", strWhere);
                        }

                        connection.execute(strSql, [], function (err, dataCount) {
                            var total,
                                result;
                            if (err) {
                                oracle.doRelease(connection);

                                res.send(500, { status: 'ERROR', data: err.message });
                            } else {
                                oracle.doRelease(connection);

                                total = dataCount.rows[0].TOTAL;
                                result = {
                                    status: 'OK',
                                    totalCount: total,
                                    pageCount: (limit > total) ? total : limit,
                                    data: data.rows
                                };
                                res.status(200).json(result);
                            }
                        });
                    }
                });
            }
        });
    }

    // Se deja comentado el middleware ya que no tiene utilidad hasta este momento
    //router.use(function timeLog(req, res, next){
    //  log.logger.info('Time registro2_remotrb: %s', Date.now());
    //  next();
    //});

    router.get('/registro2_remotrb/:skip/:limit', getRegistro2Remotrb);

    return router;
};