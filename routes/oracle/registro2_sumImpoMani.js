/**
 * Created by diego on 11/19/14.
 */

module.exports = function (app, log){

	var oracle = require('oracle');
	var	config = require('../../config/config.js');

	function getRegistro2SumImpoMani( req, res){

		oracle.connect(config.oracle, function(err, connection) {
			if (err) { console.log("Error connecting to db:", err); return; }

			var skip = parseInt(req.params.skip, 10);
			var limit = parseInt(req.params.limit, 10);
			var strSql = "SELECT * FROM " +
				" (SELECT " +
				"	ID, " +
				"	TIPOREGISTRO, " +
				"	SUMARIA, " +
				"	CONOCIMIENTO, " +
				"	TITULOCOMPLETO, " +
				"	MARCA, " +
				"	CONSIGNATARIO, " +
				"	NOTIFICARA, " +
				"	COMENTARIO, " +
				"	CONSOLIDADO, " +
				"	TRANSITO_TRANSBORDO, " +
				"	FRACCIONADO, " +
				"	BLOQUEO, " +
				"	REGISTRADO_POR, " +
				"	REGISTRADO_EN, " +
				"	ROW_NUMBER() OVER (ORDER BY id) R " +
				"	FROM REGISTRO2_SUMIMPOMANI )" +
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

	app.get('/afip/registro2_sumimpomani/:skip/:limit', getRegistro2SumImpoMani)

};
