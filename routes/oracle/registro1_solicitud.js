/**
 * Created by diego on 11/19/14.
 */

module.exports = function (app, log){

	var oracle = require('oracle');
	var	config = require('../../config/config.js');

	function getRegistro1Solicitud( req, res){

		oracle.connect(config.oracle, function(err, connection) {
			if (err) { console.log("Error connecting to db:", err); return; }

			var skip = parseInt(req.params.skip, 10);
			var limit = parseInt(req.params.limit, 10);
			var strSql = "SELECT * FROM " +
				" (SELECT " +
				"		ID, " +
				"		TIPOREGISTRO, " +
				"		SOLICITUD, " +
				"		CUITATA, " +
				"		NOMBREATA, " +
				"		ESTADO, " +
				"		PROCESO, " +
				"		FECHA_REGISTRO, " +
				"		CUIT_IMPO, " +
				"		LUGAR_OPERATIVO, " +
				"		DEPOSITOORIGEN, " +
				"		DEPOSITODESTINO, " +
				"		MEDIOTRANSPORTEINTERNO, " +
				"		NACMEDIOTRANSPINTERNO, " +
				"		MATRICULAMEDIOTRANSPINTERNO, " +
				"		COMENTARIO, " +
				"		SUMARIA, " +
				"		NOMBREBUQUE, " +
				"		REGISTRADO_POR, " +
				"		REGISTRADO_EN, " +
				"		ROW_NUMBER() OVER (ORDER BY id) R " +
				"	FROM REGISTRO1_SOLICITUD ) " +
				"WHERE R BETWEEN :1 and :2";
			connection.execute(strSql,[skip+1, skip+limit], function (err, data){
				connection.close();
				if (err){
					res.send(500, { status:'ERROR', data: err.message });
				} else {
					res.send(200, { status:'OK', data: data });
				}
			});

		});
	}

	app.get('/afip/registro1_solicitud/:skip/:limit', getRegistro1Solicitud)

};
