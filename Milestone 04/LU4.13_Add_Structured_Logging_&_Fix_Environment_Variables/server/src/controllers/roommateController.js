'use strict';

const prisma = require('../db');
const logger = require('../logger');

exports.addRoommate = async (req, res, next) => {
    try {
        const roommate = await prisma.roommate.create({ data: { name: req.body.name } });
        logger.info('Roommate created', {
            requestId: req.requestId,
            roommateId: roommate.id
        });
        res.status(201).json(roommate);
    } catch (error) {
        logger.error('Roommate creation failed', {
            requestId: req.requestId,
            method: req.method,
            path: req.originalUrl,
            error
        });
        next(error);
    }
};

exports.getRoommates = async (req, res, next) => {
    try {
        const roommates = await prisma.roommate.findMany();
        logger.info('Roommates retrieved', {
            requestId: req.requestId,
            count: roommates.length
        });
        res.json(roommates);
    } catch (error) {
        logger.error('Roommate retrieval failed', {
            requestId: req.requestId,
            method: req.method,
            path: req.originalUrl,
            error
        });
        next(error);
    }
};
