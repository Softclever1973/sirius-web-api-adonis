// =====================================================
// SIRIUS WEB API - Controller do Dashboard
// =====================================================

export const getDashboard = async (req, res) => {
  res.json({
    success: true,
    message: 'Dashboard carregado com sucesso.',
    data: {
      empresa: req.empresa
    }
  });
};
